const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbGet, dbRun } = require('./db');
const { smtpConfigured } = require('./mailer');
const { twilioConfigured } = require('./smsTwilio');
const { dispatchDigest, currentMonthUtc } = require('./digestDeliver');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { requireFeature } = require('./requireFeature');

router.use(verifyToken);
router.use(requireFeature('digest'));

async function previewForUserMonth(userId, month) {
  const snap = await snapshotForUserMonth(userId, month);
  const top = [...(snap.expenses || [])]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 3)
    .filter((x) => Number(x.amount) > 0);
  return {
    month,
    income: snap.income,
    totalExpenses: snap.totalExpenses,
    balance: snap.balance,
    expenseRatio: Number(snap.expenseRatio.toFixed(1)),
    grade: snap.grade,
    topLines: top,
    tips: (snap.deterministicTips || []).slice(0, 3),
  };
}

async function ensurePrefs(userId) {
  let row = await dbGet('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  if (!row) {
    await dbRun(
      `INSERT INTO user_preferences (user_id, digest_enabled, digest_channel)
       VALUES (?, 0, 'none')`,
      [userId],
    );
    row = await dbGet('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  }
  return row;
}

async function toApi(row, userId) {
  const month = currentMonthUtc();
  return {
    digestEnabled: Boolean(Number(row.digest_enabled)),
    digestChannel: row.digest_channel || 'none',
    digestEmail: row.digest_email || '',
    digestPhone: row.digest_phone || '',
    digestWeekday: Number(row.digest_weekday ?? 1),
    digestFrequency: row.digest_frequency || 'weekly',
    lastSentStamp: row.digest_last_sent_at || null,
    smtpReady: smtpConfigured(),
    smsReady: twilioConfigured(),
    cronTimezone: process.env.WEEKLY_DIGEST_TZ || 'America/Los_Angeles',
    note:
      'Score summaries include your overall score, category breakdown, ledger snapshot, and top priority action.',
    preview: await previewForUserMonth(userId, month),
  };
}

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const row = await ensurePrefs(req.user.id);
    res.json(await toApi(row, req.user.id));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/', async (req, res) => {
  try {
    const {
      digestEnabled,
      digestChannel,
      digestEmail,
      digestPhone,
      digestWeekday,
      digestFrequency,
    } = req.body ?? {};

    if (digestFrequency !== undefined && !['daily', 'weekly', 'monthly'].includes(String(digestFrequency))) {
      return res.status(400).json({ error: 'digestFrequency must be daily, weekly, or monthly.' });
    }

    if (digestChannel !== undefined && !['none', 'email', 'sms'].includes(String(digestChannel))) {
      return res.status(400).json({ error: 'digestChannel must be none, email, or sms.' });
    }

    let wd = digestWeekday;
    if (wd !== undefined) {
      wd = Number(wd);
      if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
        return res.status(400).json({ error: 'digestWeekday must be an integer 0–6 (Sun–Sat).' });
      }
    }

    const email = digestEmail !== undefined ? String(digestEmail).trim() : undefined;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid digest email.' });
    }

    const phone = digestPhone !== undefined ? String(digestPhone).trim() : undefined;
    if (phone !== undefined && phone.length > 2 && phone[0] !== '+') {
      return res.status(400).json({ error: 'Use E.164 format for SMS (e.g. +14155552671).' });
    }

    const row = await ensurePrefs(req.user.id);

    let channel = digestChannel !== undefined ? String(digestChannel) : row.digest_channel || 'none';
    const enabledRaw = digestEnabled !== undefined ? Boolean(digestEnabled) : Boolean(Number(row.digest_enabled));

    /** If disabling, force channel none for clarity */
    if (!enabledRaw) channel = 'none';
    if (enabledRaw && !['email', 'sms'].includes(channel)) {
      return res.status(400).json({ error: 'When digest is enabled, choose email or sms.' });
    }

    await dbRun(
      `UPDATE user_preferences SET
         digest_enabled = ?,
         digest_channel = ?,
         digest_email = ?,
         digest_phone = ?,
         digest_weekday = COALESCE(?, digest_weekday),
         digest_frequency = COALESCE(?, digest_frequency)
       WHERE user_id = ?`,
      [
        enabledRaw ? 1 : 0,
        channel,
        email !== undefined ? email || null : row.digest_email,
        phone !== undefined ? phone || null : row.digest_phone,
        wd !== undefined ? wd : null,
        digestFrequency !== undefined ? String(digestFrequency) : null,
        req.user.id,
      ],
    );

    res.json(await toApi(await ensurePrefs(req.user.id), req.user.id));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/test', async (req, res) => {
  try {
    const row = await ensurePrefs(req.user.id);
    const channel = req.body?.channel ?? row.digest_channel ?? 'none';
    if (!['email', 'sms'].includes(channel)) {
      return res.status(400).json({ error: 'Set digest channel to email or sms (body.channel optional).' });
    }
    const testEmail = (req.body?.digestEmail ?? row.digest_email)?.trim();
    const testPhone = (req.body?.digestPhone ?? row.digest_phone)?.trim();

    if (channel === 'email') {
      if (!smtpConfigured()) {
        return res
          .status(400)
          .json({ error: 'Email not configured. Set SENDGRID_API_KEY + MAIL_FROM, or SMTP_* + MAIL_FROM.' });
      }
      if (!testEmail) return res.status(400).json({ error: 'Add a digest email to test Email delivery.' });
    }
    if (channel === 'sms') {
      if (!twilioConfigured()) return res.status(400).json({ error: 'Twilio not configured.' });
      if (!testPhone || testPhone[0] !== '+') {
        return res.status(400).json({ error: 'SMS requires digest phone in E.164 (e.g. +14155552671).' });
      }
    }

    const month = req.body?.month || currentMonthUtc();
    const merged = {
      ...row,
      digest_channel: channel,
      digest_email: testEmail || null,
      digest_phone: testPhone || null,
    };

    await dispatchDigest(merged, {
      channelOverride: channel,
      monthOverride: month,
      isAutomation: false,
      isTestSend: true,
      recordSend: false,
    });

    res.json({
      ok: true,
      message: channel === 'sms' ? 'Test SMS dispatched.' : 'Test email dispatched.',
      monthUsed: month,
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message || 'Delivery failed.' });
  }
});

module.exports = router;
