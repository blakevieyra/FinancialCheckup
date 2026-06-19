import { useState } from 'react';

const HORIZON_LABEL = { security: 'Security', wealth: 'Long-term' };
const PRIORITY_COLOR = { HIGH: '#f87171', MED: '#fbbf24', LOW: '#94a3b8' };

function TimelineCard({ item, expanded, onToggle, cardSoftStyle }) {
  const color = PRIORITY_COLOR[item.priority] || '#94a3b8';
  return (
    <div
      style={{
        ...cardSoftStyle,
        padding: 0,
        overflow: 'hidden',
        border: expanded ? `1px solid ${color}44` : undefined,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0.85rem 1rem',
          display: 'grid',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{item.title}</div>
          <span style={{ fontSize: 18, opacity: 0.5, flexShrink: 0 }}>{expanded ? '−' : '+'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
          <span style={{ padding: '2px 8px', borderRadius: 99, background: `${color}22`, color, fontWeight: 700 }}>
            {item.priority}
          </span>
          {item.horizon ? (
            <span style={{ opacity: 0.65 }}>{HORIZON_LABEL[item.horizon] || item.horizon}</span>
          ) : null}
        </div>
        {!expanded ? (
          <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.detail}
          </div>
        ) : null}
      </button>
      {expanded ? (
        <div className="fc-fade-in" style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.12)' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 10, lineHeight: 1.5 }}>{item.detail}</div>
          {item.steps?.length ? (
            <ol style={{ margin: '10px 0 0', paddingLeft: '1.2rem', fontSize: 13, lineHeight: 1.5 }}>
              {item.steps.map((step, j) => <li key={j}>{step}</li>)}
            </ol>
          ) : null}
          {item.timeline ? <div style={{ fontSize: 12, opacity: 0.72, marginTop: 8 }}>{item.timeline}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function RecommendationTimeline({ timeline, cardSoftStyle, compact, isMobile }) {
  const phases = (timeline || []).filter((p) => p.items?.length);
  const [expandedKey, setExpandedKey] = useState(null);
  if (!phases.length) return null;

  const gridCols = isMobile || compact ? '1fr' : 'repeat(2, minmax(0, 1fr))';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Your action timeline</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
          Summary cards by period — tap any item for full steps.
        </div>
      </div>
      {phases.map((phase) => (
        <div key={phase.timeframe}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.65, marginBottom: 10, fontWeight: 700 }}>
            {phase.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10 }}>
            {phase.items.slice(0, compact ? 2 : 8).map((item, i) => {
              const key = `${phase.timeframe}-${item.title}-${i}`;
              return (
                <TimelineCard
                  key={key}
                  item={item}
                  cardSoftStyle={cardSoftStyle}
                  expanded={expandedKey === key}
                  onToggle={() => setExpandedKey((k) => (k === key ? null : key))}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
