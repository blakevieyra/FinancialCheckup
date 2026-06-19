const PRIORITY_STYLE = {
  HIGH: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#fca5a5' },
  MED: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#fcd34d' },
  LOW: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', color: '#cbd5e1' },
};

function SectionShell({ title, subtitle, children, cardSoftStyle }) {
  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.15rem', display: 'grid', gap: 14 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 13, opacity: 0.78, marginTop: 4, lineHeight: 1.45 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function PrioritiesPanel({ actionPlan, cardSoftStyle, onGoFinances, btnNeutral }) {
  const items = (actionPlan || []).slice(0, 5);
  if (!items.length) return null;

  return (
    <SectionShell
      title="Top priorities"
      subtitle="Start here — ranked by impact on your score. Tap Finances to update the numbers behind each item."
      cardSoftStyle={cardSoftStyle}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => {
          const style = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.MED;
          return (
            <div
              key={`${item.title}-${i}`}
              style={{
                padding: '0.9rem 1rem',
                borderRadius: 12,
                border: `1px solid ${style.border}`,
                background: style.bg,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>
                  <span style={{ opacity: 0.65, marginRight: 6 }}>#{i + 1}</span>
                  {item.title}
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: `${style.color}22`, color: style.color }}>
                  {item.priority || 'MED'}
                </span>
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>{item.detail}</div>
              {item.steps?.[0] ? (
                <div style={{ fontSize: 13, opacity: 0.82, padding: '8px 10px', borderRadius: 8, background: 'rgba(15,23,42,0.35)' }}>
                  <strong>First step:</strong> {item.steps[0]}
                </div>
              ) : null}
              {item.timeline ? <div style={{ fontSize: 12, opacity: 0.7 }}>{item.timeline}</div> : null}
            </div>
          );
        })}
      </div>
      {onGoFinances ? (
        <button type="button" onClick={onGoFinances} style={{ ...btnNeutral, justifySelf: 'start', fontSize: 13 }}>
          Update data in Finances →
        </button>
      ) : null}
    </SectionShell>
  );
}

export { SectionShell };
