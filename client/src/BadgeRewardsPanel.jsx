import { useEffect, useRef, useState } from 'react';
import { earnedBadges, nextLevelBadge, nextXpBadge, levelUpMessage } from './badgeProgression';
import { levelTier, xpProgressLabel, xpRewardMultiplier } from './progression';
import { FieldSummary, SectionHeader, SnapshotCard, TotalBar } from './panelPrimitives';

export default function BadgeRewardsPanel({ userXp, cardSoftStyle }) {
  const prevXp = useRef(userXp);
  const [levelUpNotice, setLevelUpNotice] = useState('');

  useEffect(() => {
    const msg = levelUpMessage(prevXp.current, userXp);
    if (msg && userXp > prevXp.current) setLevelUpNotice(msg);
    prevXp.current = userXp;
  }, [userXp]);

  const xpInfo = xpProgressLabel(userXp);
  const tier = levelTier(xpInfo.level);
  const multPct = Math.round(xpRewardMultiplier(xpInfo.level) * 100);
  const badges = earnedBadges(userXp);
  const nextLevel = nextLevelBadge(userXp);
  const nextXp = nextXpBadge(userXp);
  const pct = xpInfo.next > 0 ? Math.round((xpInfo.current / xpInfo.next) * 100) : 0;

  return (
    <SnapshotCard
      title="Level & rewards"
      subtitle={`${tier.name} tier — earn ${multPct}% XP on checkups & saves. Higher levels need more XP but pay bigger bonuses.`}
      cardSoftStyle={cardSoftStyle}
      accent="#3b82f6"
    >
      <TotalBar
        label={`Level ${xpInfo.level}`}
        value={`${xpInfo.current.toLocaleString()} / ${xpInfo.next.toLocaleString()} XP`}
        variant="neutral"
        compact
      />

      <FieldSummary hasValue>
        {pct}% to next level
      </FieldSummary>

      <div style={{ marginTop: 2, height: 6, borderRadius: 99, background: 'rgba(15,23,42,0.5)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #0ea5e9)', borderRadius: 99 }} />
      </div>

      {levelUpNotice ? (
        <div style={{ fontSize: 13, padding: '0.65rem 0.75rem', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', lineHeight: 1.45, color: '#86efac' }}>
          {levelUpNotice}
        </div>
      ) : null}

      <div>
        <SectionHeader title={`Badges earned (${badges.length})`} subtitle="Recent milestones from your activity." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {badges.slice(-8).map((b) => (
            <span
              key={b.id}
              title={`${b.name}${b.reward ? ` — ${b.reward}` : ''}`}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 99,
                background: 'rgba(77,166,255,0.15)',
                border: '1px solid rgba(77,166,255,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{b.icon}</span>
              <span>{b.name}</span>
            </span>
          ))}
        </div>
      </div>

      {(nextLevel || nextXp) ? (
        <FieldSummary hasValue={false}>
          {nextLevel ? `Next badge at Level ${nextLevel.level}: ${nextLevel.icon} ${nextLevel.name}` : ''}
          {nextLevel && nextXp ? ' · ' : ''}
          {nextXp ? `Next XP badge at ${nextXp.xp} XP: ${nextXp.icon} ${nextXp.name}` : ''}
        </FieldSummary>
      ) : null}
    </SnapshotCard>
  );
}
