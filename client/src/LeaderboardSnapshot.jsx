export default function LeaderboardSnapshot({ rankData, busy, error, cardSoftStyle }) {
  if (busy) {
    return (
      <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', fontSize: 13, opacity: 0.75 }}>
        Updating leaderboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', fontSize: 13, color: '#fca5a5' }}>
        {error}
      </div>
    );
  }

  if (!rankData) return null;

  const rows = (rankData.leaderboard || []).slice(0, 3);

  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', display: 'grid', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Leaderboard
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>
          #{rankData.yourRankLabel} of {rankData.totalRanked}
        </div>
        <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
          Budget score · {rankData.month}
        </div>
      </div>

      {rankData.you?.eligible ? (
        <div style={{ fontSize: 13, opacity: 0.88 }}>
          You: <strong>{Number(rankData.you.healthScore).toFixed(1)}</strong> · {rankData.you.grade} ·{' '}
          {rankData.you.expenseRatio != null ? `${rankData.you.expenseRatio}% ratio` : '—'}
        </div>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.75 }}>Add income this month to appear on the board.</div>
      )}

      {rows.length ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {rows.map((row, idx) => (
            <div
              key={`${row.rank}-${row.username}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr auto',
                gap: 8,
                alignItems: 'center',
                fontSize: 12,
                padding: '4px 6px',
                borderRadius: 8,
                background: row.isYou ? 'rgba(59,130,246,0.14)' : 'transparent',
              }}
            >
              <span style={{ opacity: 0.7 }}>{row.rank}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.username}
                {row.isYou ? ' (you)' : ''}
              </span>
              <span style={{ fontWeight: 700 }}>{row.healthScore != null ? Number(row.healthScore).toFixed(1) : '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
