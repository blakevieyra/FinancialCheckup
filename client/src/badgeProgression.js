import { levelFromXp, levelTier, levelUpBonus, xpRewardMultiplier } from './progression';

/** Badges unlocked at specific levels — rewards scale with tier */
export const LEVEL_BADGES = [
  { level: 1, id: 'starter', name: 'Account created', icon: '🌱', reward: 'Welcome bonus — guided overview unlocked' },
  { level: 2, id: 'first_steps', name: 'First steps', icon: '👣', reward: '+5% XP on all actions' },
  { level: 3, id: 'tracker', name: 'Data tracker', icon: '📊', reward: 'Progress insights on Overview' },
  { level: 5, id: 'planner', name: 'Strategic planner', icon: '🎯', reward: 'Planner tier — +10% XP multiplier' },
  { level: 7, id: 'builder', name: 'Wealth builder', icon: '📈', reward: 'Goal-based strategy tips unlocked' },
  { level: 10, id: 'veteran', name: 'Checkup veteran', icon: '🏆', reward: 'Veteran tier — +20% XP & header badge' },
  { level: 15, id: 'master', name: 'Financial master', icon: '⭐', reward: 'Master recognition + level-up bonuses grow' },
  { level: 20, id: 'legend', name: 'Checkup legend', icon: '💎', reward: 'Legend tier — +40% XP multiplier' },
  { level: 25, id: 'architect', name: 'Plan architect', icon: '🏛️', reward: 'Priority roadmap highlights on Overview' },
  { level: 30, id: 'steward', name: 'Wealth steward', icon: '🛡️', reward: '+50% XP on checkups & AI reports' },
  { level: 40, id: 'sage', name: 'Finance sage', icon: '🧠', reward: 'Expert tier — elite badge styling' },
  { level: 50, id: 'titan', name: 'Wealth titan', icon: '👑', reward: 'Legend tier — +100% XP multiplier cap path' },
  { level: 60, id: 'oracle', name: 'Market oracle', icon: '🔮', reward: 'Maximum level-up bonuses (+600 XP at L60)' },
  { level: 75, id: 'mythic', name: 'Mythic financier', icon: '⚡', reward: 'Mythic tier — 2.5× XP on every action' },
  { level: 100, id: 'immortal', name: 'Century club', icon: '🌟', reward: 'Permanent Century Club prestige badge' },
];

/** Bonus badges from total XP milestones */
export const XP_BADGES = [
  { xp: 2500, id: 'century', name: 'First century', icon: '💯', reward: '2,500 XP milestone — momentum boost' },
  { xp: 10000, id: 'momentum', name: 'Momentum builder', icon: '🔥', reward: '10,000 XP — dedicated tracker' },
  { xp: 25000, id: 'committed', name: 'Fully committed', icon: '🛡️', reward: '25,000 XP — long-term commitment' },
  { xp: 50000, id: 'marathon', name: 'Marathon saver', icon: '🏃', reward: '50,000 XP — elite endurance' },
  { xp: 100000, id: 'centurion', name: 'Centurion', icon: '🏅', reward: '100,000 XP — hall of fame status' },
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
  const tier = levelTier(nextLevel);
  const bonus = levelUpBonus(nextLevel);
  const mult = Math.round(xpRewardMultiplier(nextLevel) * 100);

  const parts = [`Level ${nextLevel}! ${tier.name} tier (${mult}% XP).`];
  if (bonus > 0) parts.push(`+${bonus} level-up bonus.`);
  if (badge) parts.push(`"${badge.name}" — ${badge.reward}.`);
  return parts.join(' ');
}
