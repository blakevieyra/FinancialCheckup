const { dbGet, dbRun } = require('./db');

const TRIAL_DAYS = Math.max(1, Number(process.env.STRIPE_TRIAL_DAYS || process.env.PRO_TRIAL_DAYS || 7));

function trialDaysRemaining(periodEnd) {
  if (!periodEnd) return null;
  const ms = new Date(periodEnd).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

/** Legacy app-granted trials (plan=trial, no Stripe sub) — expire if still in DB. */
function isLegacyAppTrial(row) {
  return row?.status === 'trialing' && row?.plan === 'trial' && !row?.stripe_subscription_id;
}

function isStripeTrialing(row) {
  return row?.status === 'trialing' && Boolean(row?.stripe_subscription_id);
}

async function expireWelcomeTrialIfNeeded(userId) {
  const row = await dbGet(
    `SELECT status, plan, current_period_end, stripe_subscription_id, stripe_customer_id,
            cancel_at_period_end, updated_at
     FROM subscriptions WHERE user_id = ?`,
    [userId],
  );
  if (!row || !isLegacyAppTrial(row)) return row;
  if (!row.current_period_end) return row;
  if (new Date(row.current_period_end).getTime() > Date.now()) return row;

  await dbRun(
    `UPDATE subscriptions
     SET status = 'free', plan = 'free', updated_at = to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     WHERE user_id = ? AND status = 'trialing' AND plan = 'trial' AND stripe_subscription_id IS NULL`,
    [userId],
  );
  return { ...row, status: 'free', plan: 'free' };
}

module.exports = {
  TRIAL_DAYS,
  trialDaysRemaining,
  isLegacyAppTrial,
  isStripeTrialing,
  expireWelcomeTrialIfNeeded,
};
