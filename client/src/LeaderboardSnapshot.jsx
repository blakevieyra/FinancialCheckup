import { FieldSummary, PANEL_GROUP_SHELL, SnapshotCard } from './panelPrimitives';

export default function LeaderboardSnapshot({ rankData, busy, error, cardSoftStyle }) {
  if (busy) {
    return (
      <SnapshotCard title="Leaderboard" subtitle="Updating ranks…" cardSoftStyle={cardSoftStyle} accent="#3b82f6">
        <FieldSummary hasValue={false}>Loading your position</FieldSummary>
      </SnapshotCard>
    );
  }

  if (error) {
    return (
      <SnapshotCard title="Leaderboard" cardSoftStyle={cardSoftStyle} accent="#f87171">
        <FieldSummary hasValue={false}>{error}</FieldSummary>
      </SnapshotCard>
    );
  }

  if (!rankData) return null;

  const rows = (rankData.leaderboard || []).slice(0, 3);

  return (
    <SnapshotCard
      title="Leaderboard"
      subtitle="Level & XP · all-time"
      cardSoftStyle={cardSoftStyle}
      accent="#3b82f6"
    >
      <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
        #{rankData.yourRankLabel} of {rankData.totalRanked}
      </div>

      {rankData.you ? (
        <FieldSummary hasValue>
          You: Level <strong>{rankData.you.level}</strong> · {Number(rankData.you.xp).toLocaleString()} XP
        </FieldSummary>
      ) : (
        <FieldSummary hasValue={false}>Complete a checkup to start earning XP.</FieldSummary>
      )}

      {rows.length ? (
        <div style={{ ...PANEL_GROUP_SHELL, padding: '0.5rem 0' }}>
          {rows.map((row, idx) => (
            <div
              key={`${row.rank}-${row.username}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr auto',
                gap: 8,
                alignItems: 'center',
                fontSize: 12,
                padding: '0.45rem 0.75rem',
                background: row.isYou ? 'rgba(59,130,246,0.14)' : 'transparent',
              }}
            >
              <span style={{ color: '#94a3b8' }}>{row.rank}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.username}
                {row.isYou ? ' (you)' : ''}
              </span>
              <span style={{ fontWeight: 700, textAlign: 'right' }}>
                Lv {row.level}
                <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>
                  {Number(row.xp).toLocaleString()} XP
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </SnapshotCard>
  );
}
