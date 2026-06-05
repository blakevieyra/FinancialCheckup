function ringColor(score) {
  const pct = Number(score) || 0;
  if (pct >= 80) return '#22c55e';
  if (pct >= 65) return '#60a5fa';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreHero({
  result,
  income,
  totalExpenses,
  budgetGrade,
  month,
  isMobile,
  cardSoftStyle,
  btnPrimary,
  onUpdateScore,
  updateBusy,
  onGoProfile,
  onGoMoney,
}) {
  if (!result) {
    return (
      <div style={{ ...cardSoftStyle, padding: '1rem', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 19 }}>Your financial score</div>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45 }}>
          Add your <button type="button" onClick={onGoMoney} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>income & spending</button>
          {' '}for {month}, then complete your{' '}
          <button type="button" onClick={onGoProfile} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>profile</button>
          {' '}to get your 0–100 score across 6 areas.
        </p>
        <button type="button" onClick={onUpdateScore} disabled={updateBusy} style={{ ...btnPrimary, justifySelf: 'start' }}>
          {updateBusy ? 'Calculating…' : 'Calculate my score'}
        </button>
      </div>
    );
  }

  const color = ringColor(result.overallScore);
  const budgetDim = (result.dimensions || []).find((d) => d.key === 'budget');

  return (
    <div style={{ ...cardSoftStyle, padding: '1rem', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            width: isMobile ? 72 : 88,
            height: isMobile ? 72 : 88,
            borderRadius: '50%',
            border: `4px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: isMobile ? 26 : 32,
            color,
            flexShrink: 0,
          }}
        >
          {Math.round(result.overallScore)}
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Financial Checkup Score</div>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22, lineHeight: 1.25 }}>{result.headline}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
            Budget (from Money): ${Number(income || 0).toLocaleString()} in · ${Number(totalExpenses || 0).toLocaleString()} out · grade <strong>{budgetGrade}</strong>
            {budgetDim ? <> · budget dimension <strong>{Math.round(budgetDim.score)}</strong></> : null}
          </div>
        </div>
        <button type="button" onClick={onUpdateScore} disabled={updateBusy} style={{ ...btnPrimary, alignSelf: isMobile ? 'stretch' : 'center' }}>
          {updateBusy ? 'Updating…' : 'Update score'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
        {(result.dimensions || []).map((d) => (
          <div key={d.key} style={{ textAlign: 'center', padding: '0.4rem', borderRadius: 8, background: 'rgba(15,23,42,0.45)' }}>
            <div style={{ fontSize: 10, opacity: 0.75 }}>{d.label}</div>
            <div style={{ fontWeight: 800 }}>{Math.round(d.score)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
