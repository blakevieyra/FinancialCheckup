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
      subtitle={`Budget score · ${rankData.month}`}
      cardSoftStyle={cardSoftStyle}
      accent="#3b82f6"
    >
      <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
        #{rankData.yourRankLabel} of {rankData.totalRanked}
      </div>

      {rankData.you?.eligible ? (
        <FieldSummary hasValue>
          You: {Number(rankData.you.healthScore).toFixed(1)} · {rankData.you.expenseRatio != null ? `${rankData.you.expenseRatio}% expense ratio` : '—'}
        </FieldSummary>
      ) : (
        <FieldSummary hasValue={false}>Add income this month to appear on the board.</FieldSummary>
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
              <span style={{ fontWeight: 700 }}>{row.healthScore != null ? Number(row.healthScore).toFixed(1) : '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </SnapshotCard>
  );
}
