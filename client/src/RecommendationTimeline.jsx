const HORIZON_LABEL = { security: 'Security', wealth: 'Long-term' };

export default function RecommendationTimeline({ timeline, cardSoftStyle, compact }) {
  const phases = (timeline || []).filter((p) => p.items?.length);
  if (!phases.length) return null;

  return (
    <div style={{ ...cardSoftStyle, padding: '0.85rem', display: 'grid', gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700 }}>Timeline by period</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Security items first, then long-term wealth building.</div>
      </div>
      {phases.map((phase) => (
        <div key={phase.timeframe}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7, marginBottom: 8 }}>
            {phase.label}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {phase.items.slice(0, compact ? 2 : 6).map((item, i) => (
              <div key={`${phase.timeframe}-${item.title}-${i}`} style={{ borderLeft: `3px solid ${item.priority === 'HIGH' ? '#ef4444' : '#f59e0b'}`, paddingLeft: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {item.title}
                  <span style={{ fontWeight: 500, opacity: 0.65, fontSize: 11, marginLeft: 6 }}>[{item.priority}]</span>
                  {item.horizon ? (
                    <span style={{ fontWeight: 500, opacity: 0.55, fontSize: 10, marginLeft: 6 }}>{HORIZON_LABEL[item.horizon] || item.horizon}</span>
                  ) : null}
                </div>
                <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>{item.detail}</div>
                {item.steps?.length ? (
                  <ol style={{ margin: '6px 0 0', paddingLeft: '1.1rem', fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
                    {item.steps.slice(0, compact ? 2 : 4).map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                ) : null}
                {item.timeline ? <div style={{ fontSize: 11, opacity: 0.72, marginTop: 4 }}>{item.timeline}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
