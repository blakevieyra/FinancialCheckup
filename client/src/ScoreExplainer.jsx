function dimColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#60a5fa';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreExplainer({ explanation, isMobile, cardSoftStyle, compact, onGoTab, btnNeutral, bare }) {
  if (!explanation) return null;

  const dims = explanation.dimensions || [];

  return (
    <div style={bare ? { display: 'grid', gap: 12 } : { ...cardSoftStyle, padding: '0.85rem', display: 'grid', gap: 12 }}>
      {!bare ? (
      <div>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 15 : 17 }}>How your score works</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>{explanation.summary}</p>
        <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>{explanation.formula}</p>
      </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.88, lineHeight: 1.5 }}>{explanation.summary}</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>{explanation.formula}</p>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '0.65rem', borderRadius: 8, border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.08)' }}>
          <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase' }}>Short-term security</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: dimColor(explanation.securityScore) }}>{Math.round(explanation.securityScore)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>{explanation.securitySummary}</div>
        </div>
        <div style={{ padding: '0.65rem', borderRadius: 8, border: '1px solid rgba(167,139,250,0.35)', background: 'rgba(167,139,250,0.08)' }}>
          <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase' }}>Long-term health</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: dimColor(explanation.wealthScore) }}>{Math.round(explanation.wealthScore)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>{explanation.wealthSummary}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {dims.map((d) => (
          <div
            key={d.key}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: compact ? '0.5rem 0.65rem' : '0.65rem 0.75rem',
              borderLeft: `3px solid ${dimColor(d.score)}`,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {d.label}{' '}
                <span style={{ color: dimColor(d.score) }}>{Math.round(d.score)}</span>
                <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 12 }}> ({d.grade})</span>
                {!d.includedInOverall ? (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.65 }}>excluded from total</span>
                ) : null}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: d.horizon === 'wealth' ? 'rgba(167,139,250,0.2)' : 'rgba(56,189,248,0.2)',
                  }}
                >
                  {d.horizon === 'wealth' ? 'long-term' : 'security'}
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {d.includedInOverall
                  ? `${d.weightPct}% of total · +${d.contribution} pts${d.potentialLift > 0 ? ` · up to +${d.potentialLift} if fixed` : ''}`
                  : 'Tracked only — not counted in overall score'}
              </div>
            </div>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4, lineHeight: 1.45 }}>{d.why}</div>
            {!compact ? (
              <>
                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>
                  <strong>Quick fix:</strong> {d.improveBy}
                </div>
                {d.actions?.length ? (
                  <ol style={{ margin: '6px 0 0', paddingLeft: '1.2rem', fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
                    {d.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                ) : null}
                {onGoTab && d.goToTab ? (
                  <button
                    type="button"
                    onClick={() => onGoTab(d.goToTab)}
                    style={{ ...btnNeutral, marginTop: 8, fontSize: 12, padding: '0.35rem 0.6rem' }}
                  >
                    Open Finances tab →
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>

      {compact ? (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          See numbered steps above, or open <strong>Finances</strong> for the full dimension breakdown.
        </div>
      ) : null}
    </div>
  );
}
