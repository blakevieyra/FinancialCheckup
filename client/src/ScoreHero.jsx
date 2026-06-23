import ScoreBreakdownShowcase from './ScoreBreakdownShowcase';
import { scoreBarColor } from './theme';

function scoreStatusLabel(score) {
  if (score >= 75) return 'On track';
  if (score >= 50) return 'Needs attention';
  return 'Priority fix';
}

export default function ScoreHero({
  result,
  income,
  totalExpenses,
  isMobile,
  cardSoftStyle,
  checkupBusy,
  onGoFinances,
}) {
  if (!result) {
    return (
      <div style={{ ...cardSoftStyle, padding: '1.25rem', display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 20 }}>Your financial score</div>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45, maxWidth: 560 }}>
          Enter your data on{' '}
          <button type="button" onClick={onGoFinances} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Finances
          </button>
          {' '}— your score will appear here automatically.
        </p>
      </div>
    );
  }

  const excluded = new Set(result.excludedFromScore || []);
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const expenseRatio = inc > 0 ? (exp / inc) * 100 : null;

  const dimensions = (result.dimensions || []).map((d) => ({
    key: d.key,
    label: d.label,
    score: d.score,
    excluded: excluded.has(d.key),
    summary: d.summary,
    why: d.why,
    improveBy: d.improveBy,
  }));

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {checkupBusy ? (
        <div style={{ fontSize: 12, color: '#93c5fd', opacity: 0.9, textAlign: 'center' }}>Recalculating score…</div>
      ) : null}
      <ScoreBreakdownShowcase
        overallScore={result.overallScore}
        headline={result.headline}
        dimensions={dimensions}
        badge="Financial Checkup Score"
        large
        isMobile={isMobile}
        autoCycle
        cycleIntervalMs={4500}
        renderDetail={(dim) => {
          const color = scoreBarColor(dim.score);
          const status = scoreStatusLabel(dim.score);
          const explanation = dim.why || dim.summary;

          return (
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${color}14, rgba(15,23,42,0.55))`,
                border: `1px solid ${color}40`,
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {status}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4, letterSpacing: '-0.02em' }}>{dim.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Score</div>
                  <div style={{ fontWeight: 800, fontSize: 32, color, lineHeight: 1, marginTop: 2 }}>
                    {Math.round(dim.score)}
                  </div>
                </div>
              </div>

              {explanation ? (
                <p style={{ margin: 0, fontSize: 15, color: '#f1f5f9', lineHeight: 1.55, fontWeight: 500 }}>
                  {explanation}
                </p>
              ) : null}

              {dim.key === 'budget' && inc > 0 ? (
                <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
                  You brought in <strong style={{ color: '#86efac' }}>${inc.toLocaleString()}</strong> and spent{' '}
                  <strong style={{ color: '#fca5a5' }}>${exp.toLocaleString()}</strong>
                  {expenseRatio != null ? (
                    <> — that&apos;s <strong>{expenseRatio.toFixed(1)}%</strong> of income on expenses</>
                  ) : null}
                  .
                </div>
              ) : null}

              {dim.improveBy ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(15,23,42,0.65)',
                    borderLeft: `3px solid ${color}`,
                    fontSize: 14,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>What to do next: </span>
                  {dim.improveBy}
                </div>
              ) : null}

              <button
                type="button"
                onClick={onGoFinances}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#93c5fd',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Improve this in Finances →
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}
