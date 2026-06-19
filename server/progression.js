const XP_PER_LEVEL = 100;

const XP_REWARDS = {
  checkup: 25,
  saveData: 10,
  aiReport: 15,
  goalCreated: 20,
  onboarding: 50,
};

function levelFromXp(xp) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

async function computeBaselineXp(dbGet, userId) {
  const checkups = await dbGet('SELECT COUNT(*) AS c FROM checkup_history WHERE user_id = ?', [userId]);
  const goals = await dbGet('SELECT COUNT(*) AS c FROM goals WHERE user_id = ?', [userId]);
  const prefs = await dbGet(
    'SELECT onboarding_complete, xp_total FROM user_preferences WHERE user_id = ?',
    [userId],
  );

  let xp = Number(prefs?.xp_total) || 0;
  const checkupCount = Number(checkups?.c) || 0;
  const goalCount = Number(goals?.c) || 0;

  let baseline = 0;
  baseline += checkupCount * XP_REWARDS.checkup;
  baseline += goalCount * XP_REWARDS.goalCreated;
  if (prefs?.onboarding_complete) baseline += XP_REWARDS.onboarding;
  if (checkupCount > 0) baseline = Math.max(baseline, XP_REWARDS.checkup);

  return Math.max(xp, baseline);
}

module.exports = {
  XP_PER_LEVEL,
  XP_REWARDS,
  levelFromXp,
  computeBaselineXp,
};
