const XP_PER_LEVEL = 100;

const XP_REWARDS = {
  checkup: 25,
  saveData: 10,
  aiReport: 15,
  goalCreated: 20,
  onboarding: 50,
};

function xpToNextLevel(level) {
  const l = Math.max(1, Math.floor(level));
  return Math.floor(100 + (l - 1) * 40 + (l - 1) ** 1.55 * 15);
}

function totalXpForLevel(level) {
  const target = Math.max(1, Math.floor(level));
  let total = 0;
  for (let i = 1; i < target; i += 1) {
    total += xpToNextLevel(i);
  }
  return total;
}

function levelFromXp(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (totalXpForLevel(level + 1) <= x) {
    level += 1;
    if (level >= 500) break;
  }
  return level;
}

function xpInCurrentLevel(xp) {
  const lvl = levelFromXp(xp);
  return Math.max(0, xp - totalXpForLevel(lvl));
}

function xpProgressForTotal(xp) {
  const level = levelFromXp(xp);
  return {
    level,
    current: xpInCurrentLevel(xp),
    next: xpToNextLevel(level),
    total: xp,
  };
}

function xpRewardMultiplier(level) {
  const tier = Math.floor((Math.max(1, level) - 1) / 5);
  return Math.min(2.5, 1 + tier * 0.1);
}

function scaledXpReward(reason, level) {
  const base = XP_REWARDS[reason] || 0;
  if (!base) return 0;
  return Math.max(1, Math.round(base * xpRewardMultiplier(level)));
}

function levelUpBonus(level) {
  return Math.floor(20 + level * 10);
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
  xpToNextLevel,
  totalXpForLevel,
  levelFromXp,
  xpInCurrentLevel,
  xpProgressForTotal,
  xpRewardMultiplier,
  scaledXpReward,
  levelUpBonus,
  computeBaselineXp,
};
