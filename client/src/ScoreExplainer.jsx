import { scoreBarColor } from './theme';
import { FieldSummary, InnerItemCard, SectionHeader, TotalBar } from './panelPrimitives';

function dimColor(score) {
  return scoreBarColor(score);
}

export default function ScoreExplainer({ explanation, isMobile, cardSoftStyle, compact, onGoTab, btnNeutral, bare }) {
  if (!explanation) return null;

  const dims = explanation.dimensions || [];

  return (
    <div style={bare ? { display: 'grid', gap: 14 } : { ...cardSoftStyle, padding: '0.85rem', display: 'grid', gap: 14 }}>
      <SectionHeader
        title="How your score works"
        subtitle={explanation.summary}
      />
      <FieldSummary hasValue>
        {explanation.formula}
      </FieldSummary>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        <TotalBar
          label="Short-term security"
          value={Math.round(explanation.securityScore)}
          variant="neutral"
          compact
        />
        <TotalBar
          label="Long-term health"
          value={Math.round(explanation.wealthScore)}
          variant="neutral"
          compact
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {dims.map((d) => (
          <InnerItemCard
            key={d.key}
            cardSoftStyle={cardSoftStyle}
            style={{ borderLeft: `3px solid ${dimColor(d.score)}`, padding: compact ? '0.65rem 0.75rem' : '0.75rem' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {d.label}{' '}
                <span style={{ color: dimColor(d.score) }}>{Math.round(d.score)}</span>
                {!d.includedInOverall ? (
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b' }}>excluded from total</span>
                ) : null}
              </div>
              <FieldSummary hasValue={d.includedInOverall}>
                {d.includedInOverall
                  ? `${d.weightPct}% of total · +${d.contribution} pts`
                  : 'Tracked only — not counted in overall score'}
              </FieldSummary>
            </div>
            <FieldSummary hasValue>{d.why}</FieldSummary>
            {!compact ? (
              <>
                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Quick fix:</strong> {d.improveBy}
                </div>
                {d.actions?.length ? (
                  <ol style={{ margin: '6px 0 0', paddingLeft: '1.2rem', fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                    {d.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                ) : null}
                {onGoTab && d.goToTab ? (
                  <button type="button" onClick={() => onGoTab(d.goToTab)} style={{ ...btnNeutral, justifySelf: 'start', fontSize: 12, marginTop: 4 }}>
                    Go to {d.goToTab} →
                  </button>
                ) : null}
              </>
            ) : null}
          </InnerItemCard>
        ))}
      </div>
    </div>
  );
}
