const { dbGet, dbRun } = require('./db');

/** Free Pro access for new accounts — override with PRO_TRIAL_DAYS on Render. */
const TRIAL_DAYS = Math.max(1, Number(process.env.PRO_TRIAL_DAYS || 7));

function trialEndIso(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 86400000).toISOString();
}

function trialDaysRemaining(periodEnd) {
  if (!periodEnd) return null;
  const ms = new Date(periodEnd).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

function isWelcomeTrial(row) {
  return row?.status === 'trialing' && row?.plan === 'trial' && !row?.stripe_subscription_id;
}

/**
 * Downgrade expired welcome trials (app-granted, not Stripe-managed).
 * Returns the current subscription row after any update.
 */
async function expireWelcomeTrialIfNeeded(userId) {
  const row = await dbGet(
    `SELECT status, plan, current_period_end, stripe_subscription_id, stripe_customer_id,
            cancel_at_period_end, updated_at
     FROM subscriptions WHERE user_id = ?`,
    [userId],
  );
  if (!row || !isWelcomeTrial(row)) return row;
  if (!row.current_period_end) return row;
  if (new Date(row.current_period_end).getTime() > Date.now()) return row;

  await dbRun(
    `UPDATE subscriptions
     SET status = 'free', plan = 'free', updated_at = to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     WHERE user_id = ? AND status = 'trialing' AND plan = 'trial' AND stripe_subscription_id IS NULL`,
    [userId],
  );
  return {
    ...row,
    status: 'free',
    plan: 'free',
  };
}

async function grantNewUserProTrial(userId) {
  const end = trialEndIso();
  const existing = await dbGet('SELECT user_id, stripe_subscription_id FROM subscriptions WHERE user_id = ?', [userId]);
  if (existing?.stripe_subscription_id) {
    return false;
  }
  if (existing) {
    await dbRun(
      `UPDATE subscriptions
       SET status = 'trialing', plan = 'trial', current_period_end = ?, cancel_at_period_end = 0,
           updated_at = to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
       WHERE user_id = ?`,
      [end, userId],
    );
  } else {
    await dbRun(
      `INSERT INTO subscriptions (user_id, status, plan, current_period_end, cancel_at_period_end)
       VALUES (?, 'trialing', 'trial', ?, 0)`,
      [userId, end],
    );
  }
  return true;
}

module.exports = {
  TRIAL_DAYS,
  trialEndIso,
  trialDaysRemaining,
  isWelcomeTrial,
  expireWelcomeTrialIfNeeded,
  grantNewUserProTrial,
};
