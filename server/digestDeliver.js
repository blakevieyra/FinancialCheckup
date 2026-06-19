const { sendEmailPlain } = require('./mailer');
const { sendSmsViaTwilio, twilioConfigured } = require('./smsTwilio');
const { digestForUserMonth } = require('./digestBuilder');
const { dbAll, dbRun } = require('./db');

/** Current ledger month aligned with the rest of the app (UTC YYYY-MM) */
function currentMonthUtc() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * weekday 0–6 in a given IANA timezone (Sunday = 0)
 */
function weekdayInTz(timeZone, date = new Date()) {
  const short = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: timeZone || 'UTC',
  });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const d = map[short];
  return typeof d === 'number' ? d : new Date(date).getDay();
}

/** YYYY-MM-DD in tz (for coarse de-dupe across digest runs same local day). */
function ymdInTz(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function digestAlreadySentForLocalCalendarDay(prefRow, timeZone, now = new Date()) {
  const ymd = ymdInTz(timeZone, now);
  if (!prefRow.digest_last_sent_at) return false;
  const prev = String(prefRow.digest_last_sent_at).slice(0, 10);
  return prev === ymd;
}

function digestAlreadySentThisMonth(prefRow, timeZone, now = new Date()) {
  const ym = ymdInTz(timeZone, now).slice(0, 7);
  if (!prefRow.digest_last_sent_at) return false;
  return String(prefRow.digest_last_sent_at).slice(0, 7) === ym;
}

function shouldSendForFrequency(prefRow, timeZone, now = new Date()) {
  const freq = prefRow.digest_frequency || 'weekly';
  if (freq === 'daily') return true;
  if (freq === 'weekly') return Number(prefRow.digest_weekday ?? 1) === weekdayInTz(timeZone, now);
  if (freq === 'monthly') return Number(ymdInTz(timeZone, now).slice(8, 10)) === 1;
  return false;
}

async function dispatchDigest(prefRow, options = {}) {
  const tz = options.tz || process.env.WEEKLY_DIGEST_TZ || 'America/Los_Angeles';
  const month = options.monthOverride || currentMonthUtc();
  const frequency = options.frequencyOverride || prefRow.digest_frequency || 'weekly';
  const digest = await digestForUserMonth(prefRow.user_id, month, frequency);

  const channel = options.channelOverride || prefRow.digest_channel || 'none';

  if (channel === 'email') {
    const addr = prefRow.digest_email;
    if (!addr) throw new Error('digest_email missing');
    await sendEmailPlain({
      to: addr,
      subject: digest.subject,
      text: digest.plain,
      html: digest.html,
    });
  } else if (channel === 'sms') {
    const phone = prefRow.digest_phone;
    if (!phone) throw new Error('SMS number missing');
    if (!twilioConfigured()) throw new Error('Twilio not configured');
    await sendSmsViaTwilio({
      to: phone,
      body: digest.plain.slice(0, 1500),
    });
  } else {
    return { skipped: true, reason: 'channel_none' };
  }

  if (options.recordSend !== false && options.isAutomation && !options.isTestSend) {
    const stamp = ymdInTz(tz);
    await dbRun(
      'UPDATE user_preferences SET digest_last_sent_at = ? WHERE user_id = ?',
      [stamp, prefRow.user_id],
    );
  }

  return { skipped: false, channelUsed: channel };
}

async function runScheduledDigestsForWeekday(now = new Date()) {
  const tz = process.env.WEEKLY_DIGEST_TZ || 'America/Los_Angeles';

  const rows = await dbAll(
    `SELECT * FROM user_preferences
     WHERE digest_enabled = 1
       AND digest_channel IN ('email','sms')`,
  );

  let sent = 0;
  const errors = [];

  for (const r of rows) {
    try {
      if (!shouldSendForFrequency(r, tz, now)) continue;

      const freq = r.digest_frequency || 'weekly';
      if (freq === 'monthly') {
        if (digestAlreadySentThisMonth(r, tz, now)) continue;
      } else if (digestAlreadySentForLocalCalendarDay(r, tz, now)) {
        continue;
      }

      await dispatchDigest(r, {
        isAutomation: true,
        isTestSend: false,
        tz,
      });
      sent += 1;
    } catch (e) {
      errors.push({ userId: r.user_id, message: e.message });
    }
  }

  return { todayWeekday: weekdayInTz(tz, now), candidates: rows.length, sent, errors };
}

module.exports = {
  dispatchDigest,
  currentMonthUtc,
  weekdayInTz,
  runScheduledDigestsForWeekday,
};
