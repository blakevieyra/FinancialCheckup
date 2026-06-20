/** Feature access by plan — aligned with Financial Checkup subscription tiers. */

const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_1TUycJ1HZuIni9E7ytJFBYib',
  annual: process.env.STRIPE_PRICE_ANNUAL || 'price_1TZwxo1HZuIni9E76TvK70yS',
};

/** $0/week price used during Stripe trial-offer period (prod_UTwVsOv5GXgccr). */
const STRIPE_PRICE_TRIAL_WEEKLY = process.env.STRIPE_PRICE_TRIAL_WEEKLY || 'price_1TkBcv1HZuIni9E77RYcHPxd';

/** Stripe Trial Offer (to_xxx) — Subscription API only; not supported in Checkout. */
const STRIPE_TRIAL_OFFER = process.env.STRIPE_TRIAL_OFFER || 'to_1TkD071HZuIni9E78QjISlD2';

const FREE_FEATURES = {
  money: true,
  profile: true,
  checkup: true,
  overview: true,
  progressCharts: true,
  checkupHistory: false,
  improvementRoadmap: false,
  aiInsights: false,
  expertBriefing: false,
  exports: false,
  goals: false,
  digest: true,
  leaderboard: true,
  businessDocs: false,
  forecast: false,
  categoryCompare: false,
};

const PRO_FEATURES = Object.fromEntries(Object.keys(FREE_FEATURES).map((k) => [k, true]));

function resolveTier(subscription) {
  if (!subscription) return 'free';
  const status = subscription.status || 'free';
  if (status === 'active' || status === 'trialing') return 'pro';
  return 'free';
}

function featuresForTier(tier) {
  return tier === 'pro' ? { ...PRO_FEATURES } : { ...FREE_FEATURES };
}

function hasFeature(tier, featureKey) {
  const f = featuresForTier(tier);
  return Boolean(f[featureKey]);
}

function tierLabel(tier, subscription) {
  if (tier === 'pro' && subscription?.status === 'trialing') return 'Pro trial';
  if (tier === 'pro') return 'Pro';
  return 'Free';
}

module.exports = {
  STRIPE_PRICES,
  STRIPE_PRICE_TRIAL_WEEKLY,
  STRIPE_TRIAL_OFFER,
  FREE_FEATURES,
  PRO_FEATURES,
  resolveTier,
  featuresForTier,
  hasFeature,
  tierLabel,
};
