/** Feature access by plan — aligned with Financial Checkup subscription tiers. */

const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_1TUycJ1HZuIni9E7ytJFBYib',
  annual: process.env.STRIPE_PRICE_ANNUAL || 'price_1TZwxo1HZuIni9E76TvK70yS',
};

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

function tierLabel(tier) {
  if (tier === 'pro') return 'Pro';
  return 'Free';
}

module.exports = {
  STRIPE_PRICES,
  FREE_FEATURES,
  PRO_FEATURES,
  resolveTier,
  featuresForTier,
  hasFeature,
  tierLabel,
};
