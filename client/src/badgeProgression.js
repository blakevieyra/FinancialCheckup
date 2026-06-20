import { levelFromXp, XP_PER_LEVEL } from './progression';

/** Badges unlocked at specific levels */
export const LEVEL_BADGES = [
  { level: 1, id: 'starter', name: 'Account created', icon: '🌱', reward: 'Welcome to Financial Checkup' },
  { level: 2, id: 'first_steps', name: 'First steps', icon: '👣', reward: 'Unlocked guided overview cards' },
  { level: 3, id: 'tracker', name: 'Data tracker', icon: '📊', reward: 'Progress insights on Overview' },
  { level: 5, id: 'planner', name: 'Strategic planner', icon: '🎯', reward: 'Priority action badges' },
  { level: 7, id: 'builder', name: 'Wealth builder', icon: '📈', reward: 'Goal-based strategy tips' },
  { level: 10, id: 'veteran', name: 'Checkup veteran', icon: '🏆', reward: 'Veteran status in header' },
  { level: 15, id: 'master', name: 'Financial master', icon: '⭐', reward: 'Master tier recognition' },
  { level: 20, id: 'legend', name: 'Checkup legend', icon: '💎', reward: 'Legend badge on profile' },
];

/** Bonus badges from total XP milestones */
export const XP_BADGES = [
  { xp: 150, id: 'century', name: 'First century', icon: '💯', reward: '+150 XP milestone' },
  { xp: 500, id: 'momentum', name: 'Momentum builder', icon: '🔥', reward: '+500 XP milestone' },
  { xp: 1000, id: 'committed', name: 'Fully committed', icon: '🛡️', reward: '+1000 XP milestone' },
];

export function earnedBadges(xp) {
  const level = levelFromXp(xp);
  const fromLevel = LEVEL_BADGES.filter((b) => level >= b.level);
  const fromXp = XP_BADGES.filter((b) => xp >= b.xp);
  return [...fromLevel, ...fromXp];
}

export function nextLevelBadge(xp) {
  const level = levelFromXp(xp);
  return LEVEL_BADGES.find((b) => b.level > level) || null;
}

export function nextXpBadge(xp) {
  return XP_BADGES.find((b) => b.xp > xp) || null;
}

export function levelUpMessage(prevXp, nextXp) {
  const prevLevel = levelFromXp(prevXp);
  const nextLevel = levelFromXp(nextXp);
  if (nextLevel <= prevLevel) return null;
  const badge = LEVEL_BADGES.find((b) => b.level === nextLevel);
  return badge
    ? `Level ${nextLevel}! You earned the "${badge.name}" badge — ${badge.reward}.`
    : `Level ${nextLevel}! Keep going to unlock more rewards.`;
}

export { XP_PER_LEVEL };
