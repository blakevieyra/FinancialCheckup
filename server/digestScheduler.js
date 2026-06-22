const cron = require('node-cron');
const { runScheduledDigestsForWeekday } = require('./digestDeliver');

let scheduledTask = null;

/** Daily cron hook: sends on each subscriber's digest_weekday local to WEEKLY_DIGEST_TZ */
function startDigestScheduler() {
  if (String(process.env.WEEKLY_DIGEST_CRON_DISABLED || '') === '1') {
    console.log('○ Weekly digest cron disabled (WEEKLY_DIGEST_CRON_DISABLED=1)');
    return null;
  }

  const cronExpr = process.env.WEEKLY_DIGEST_CRON || '0 9 * * *';
  const tz = process.env.WEEKLY_DIGEST_TZ || 'America/Los_Angeles';

  scheduledTask = cron.schedule(
    cronExpr,
    async () => {
      try {
        const r = await runScheduledDigestsForWeekday();
        if (r.sent > 0 || r.errors.length > 0) console.log('[weekly-digest]', r);
      } catch (e) {
        console.error('[weekly-digest] failed:', e.message);
      }
    },
    { timezone: tz },
  );

  console.log(`✓ Weekly digest scheduler: cron "${cronExpr}" (${tz})`);
  return scheduledTask;
}

function stopDigestScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('○ Weekly digest scheduler stopped.');
  }
}

module.exports = { startDigestScheduler, stopDigestScheduler };
