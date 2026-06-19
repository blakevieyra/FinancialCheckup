import { useState } from 'react';

const STATUS_COLOR = {
  strong: '#86efac',
  watch: '#fcd34d',
  critical: '#fca5a5',
};

function SourceList({ sources, cardSoftStyle }) {
  if (!sources?.length) return null;
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.5 }}>
      {sources.map((s, i) => (
        <li key={`${s.url}-${i}`}>
          <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
            {s.title || s.url}
          </a>
          {s.why ? <span style={{ opacity: 0.85 }}> — {s.why}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function CategoryCard({ cat, cardSoftStyle, expanded, onToggle }) {
  const color = STATUS_COLOR[cat.status] || '#94a3b8';
  return (
    <div style={{ ...cardSoftStyle, padding: 0, overflow: 'hidden' }}>
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{cat.label}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            Score {Math.round(cat.score || 0)}/100 · Grade {cat.grade || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color,
              letterSpacing: '0.04em',
            }}
          >
            {cat.status || 'watch'}
          </span>
          <span style={{ opacity: 0.6 }}>{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded ? (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.15)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 12, marginBottom: 6 }}>Optimized plan</div>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: 14, lineHeight: 1.5 }}>
            {(cat.optimizedPlan || []).map((step, i) => (
              <li key={`step-${i}`} style={{ marginBottom: 4 }}>{step}</li>
            ))}
          </ol>
          {(cat.sources?.length) ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 12 }}>Sources</div>
              <SourceList sources={cat.sources} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AiInsightsPanel({ aiPlan, cardSoftStyle, isMobile }) {
  const [expanded, setExpanded] = useState({});

  if (!aiPlan) return null;

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {aiPlan.summary ? (
        <div style={{ ...cardSoftStyle, padding: '1rem', fontSize: 15, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Executive summary</div>
          {aiPlan.summary}
        </div>
      ) : null}

      {aiPlan.emailSent ? (
        <div style={{ fontSize: 13, color: '#86efac' }}>
          A copy of this report and summary was emailed to your account address.
        </div>
      ) : aiPlan.summary ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Email copy not sent — add a verified email on your account and ensure mail is configured on the server.
        </div>
      ) : null}

      {aiPlan.insights?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Key insights</div>
          {aiPlan.insights.map((ins, idx) => (
            <div key={`${ins.title}-${idx}`} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700 }}>{ins.title}</div>
              <div style={{ marginTop: 4, opacity: 0.9, fontSize: 14, lineHeight: 1.4 }}>{ins.message}</div>
            </div>
          ))}
        </div>
      ) : null}

      {aiPlan.categoryPlans?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Optimized plans by category</div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
            Click a category to expand steps and authoritative sources.
          </p>
          {aiPlan.categoryPlans.map((cat) => (
            <CategoryCard
              key={cat.key || cat.label}
              cat={cat}
              cardSoftStyle={cardSoftStyle}
              expanded={Boolean(expanded[cat.key || cat.label])}
              onToggle={() => toggle(cat.key || cat.label)}
            />
          ))}
        </div>
      ) : null}

      {aiPlan.specialistPlans?.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Specialist guidance</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 10,
            }}
          >
            {aiPlan.specialistPlans.map((sp) => (
              <div key={sp.area} style={{ ...cardSoftStyle, padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{sp.area}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>
                    {sp.priority} priority
                  </span>
                </div>
                {sp.summary ? (
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6, lineHeight: 1.45 }}>{sp.summary}</div>
                ) : null}
                <ol style={{ margin: '10px 0 0', paddingLeft: '1.2rem', fontSize: 14, lineHeight: 1.45 }}>
                  {(sp.plan || []).map((step, i) => (
                    <li key={`sp-${i}`}>{step}</li>
                  ))}
                </ol>
                <SourceList sources={sp.sources} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {aiPlan.disclaimer ? (
        <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.4 }}>{aiPlan.disclaimer}</div>
      ) : null}
    </div>
  );
}
