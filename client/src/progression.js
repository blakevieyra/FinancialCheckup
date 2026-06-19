const XP_KEY = (userId) => (userId ? `fc-xp:${userId}` : 'fc-xp:guest');
export const XP_PER_LEVEL = 100;

export const XP_REWARDS = {
  checkup: 25,
  saveData: 10,
  aiReport: 15,
  goalCreated: 20,
  onboarding: 50,
};

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
  const amount = XP_REWARDS[reason] || 0;
  if (!amount || !userId) return loadXp(userId);
  const next = loadXp(userId) + amount;
  saveXp(userId, next);
  return next;
}

export function levelFromXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpInCurrentLevel(xp) {
  return xp % XP_PER_LEVEL;
}

export function xpProgressLabel(xp) {
  const lvl = levelFromXp(xp);
  const cur = xpInCurrentLevel(xp);
  return { level: lvl, current: cur, next: XP_PER_LEVEL, total: xp };
}
