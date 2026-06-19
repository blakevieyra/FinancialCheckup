const { dbGet } = require('./db');
const { resolveTier, hasFeature } = require('./subscriptionTiers');
const { expireWelcomeTrialIfNeeded } = require('./subscriptionService');

async function getUserTier(userId) {
  const row = await expireWelcomeTrialIfNeeded(userId);
  return resolveTier(row);
}

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const tier = await getUserTier(req.user.id);
      if (!hasFeature(tier, featureKey)) {
        return res.status(403).json({
          error: 'Upgrade to Pro to use this feature.',
          code: 'UPGRADE_REQUIRED',
          feature: featureKey,
          tier,
        });
      }
      req.userTier = tier;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  };
}

module.exports = { getUserTier, requireFeature };
