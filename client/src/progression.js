const XP_KEY = (userId) => (userId ? `fc-xp:${userId}` : 'fc-xp:guest');

/** @deprecated Use xpToNextLevel(level) — kept for legacy imports */
export const XP_PER_LEVEL = 100;

export const XP_REWARDS = {
  checkup: 25,
  saveData: 10,
  aiReport: 15,
  goalCreated: 20,
  onboarding: 50,
};

/** XP required to advance from `level` to level + 1 */
export function xpToNextLevel(level) {
  const l = Math.max(1, Math.floor(level));
  return Math.floor(100 + (l - 1) * 40 + (l - 1) ** 1.55 * 15);
}

/** Total XP at the start of `level` (level 1 starts at 0) */
export function totalXpForLevel(level) {
  const target = Math.max(1, Math.floor(level));
  let total = 0;
  for (let i = 1; i < target; i += 1) {
    total += xpToNextLevel(i);
  }
  return total;
}

export function levelFromXp(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (totalXpForLevel(level + 1) <= x) {
    level += 1;
    if (level >= 500) break;
  }
  return level;
}

export function xpInCurrentLevel(xp) {
  const lvl = levelFromXp(xp);
  return Math.max(0, xp - totalXpForLevel(lvl));
}

export function xpProgressLabel(xp) {
  const level = levelFromXp(xp);
  const current = xpInCurrentLevel(xp);
  const next = xpToNextLevel(level);
  return { level, current, next, total: xp };
}

/** +10% XP per 5 levels, capped at 2.5× */
export function xpRewardMultiplier(level) {
  const tier = Math.floor((Math.max(1, level) - 1) / 5);
  return Math.min(2.5, 1 + tier * 0.1);
}

export function scaledXpReward(reason, level) {
  const base = XP_REWARDS[reason] || 0;
  if (!base) return 0;
  return Math.max(1, Math.round(base * xpRewardMultiplier(level)));
}

/** Bonus XP granted when reaching a new level */
export function levelUpBonus(level) {
  return Math.floor(20 + level * 10);
}

export function levelTier(level) {
  const l = Math.max(1, level);
  if (l >= 75) return { id: 'mythic', name: 'Mythic', multiplier: xpRewardMultiplier(l) };
  if (l >= 50) return { id: 'legend', name: 'Legend', multiplier: xpRewardMultiplier(l) };
  if (l >= 35) return { id: 'expert', name: 'Expert', multiplier: xpRewardMultiplier(l) };
  if (l >= 20) return { id: 'master', name: 'Master', multiplier: xpRewardMultiplier(l) };
  if (l >= 10) return { id: 'veteran', name: 'Veteran', multiplier: xpRewardMultiplier(l) };
  if (l >= 5) return { id: 'planner', name: 'Planner', multiplier: xpRewardMultiplier(l) };
  return { id: 'starter', name: 'Starter', multiplier: xpRewardMultiplier(l) };
}

export function loadXp(userId) {
  try {
    return Math.max(0, Number(localStorage.getItem(XP_KEY(userId))) || 0);
  } catch {
    return 0;
  }
}

export function saveXp(userId, xp) {
  try {
    localStorage.setItem(XP_KEY(userId), String(Math.max(0, xp)));
  } catch {
    /** ignore */
  }
}

export function awardXp(userId, reason) {
  if (!userId) return loadXp(userId);
  const current = loadXp(userId);
  const startLevel = levelFromXp(current);
  const amount = scaledXpReward(reason, startLevel);
  if (!amount) return current;

  let next = current + amount;
  const endLevel = levelFromXp(next);
  if (endLevel > startLevel) {
    for (let l = startLevel + 1; l <= endLevel; l += 1) {
      next += levelUpBonus(l);
    }
  }

  saveXp(userId, next);
  return next;
}
