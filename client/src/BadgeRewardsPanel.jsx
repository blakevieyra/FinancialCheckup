import { useEffect, useRef, useState } from 'react';
import { earnedBadges, nextLevelBadge, nextXpBadge, levelUpMessage } from './badgeProgression';
import { xpProgressLabel } from './progression';

export default function BadgeRewardsPanel({ userXp, cardSoftStyle }) {
  const prevXp = useRef(userXp);
  const [levelUpNotice, setLevelUpNotice] = useState('');

  useEffect(() => {
    const msg = levelUpMessage(prevXp.current, userXp);
    if (msg && userXp > prevXp.current) setLevelUpNotice(msg);
    prevXp.current = userXp;
  }, [userXp]);

  const xpInfo = xpProgressLabel(userXp);
  const badges = earnedBadges(userXp);
  const nextLevel = nextLevelBadge(userXp);
  const nextXp = nextXpBadge(userXp);
  const pct = Math.round((xpInfo.current / xpInfo.next) * 100);

  return (
    <div style={{ ...cardSoftStyle, padding: '0.85rem 1rem', display: 'grid', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Level & rewards</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginTop: 4 }}>Level {xpInfo.level}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{xpInfo.current} / {xpInfo.next} XP to next level</div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: 'rgba(15,23,42,0.5)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #0ea5e9)', borderRadius: 99 }} />
        </div>
      </div>

      {levelUpNotice ? (
        <div style={{ fontSize: 13, padding: '0.65rem 0.75rem', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', lineHeight: 1.45 }}>
          🎉 {levelUpNotice}
        </div>
      ) : null}

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          Badges earned ({badges.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
          {nextLevel ? (
            <div>Next badge at <strong>Level {nextLevel.level}</strong>: {nextLevel.icon} {nextLevel.name}</div>
          ) : null}
          {nextXp ? (
            <div style={{ marginTop: nextLevel ? 4 : 0 }}>Next XP badge at <strong>{nextXp.xp} XP</strong>: {nextXp.icon} {nextXp.name}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
