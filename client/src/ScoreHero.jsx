import ScoreBreakdownShowcase from './ScoreBreakdownShowcase';
import { scoreBarColor } from './theme';

export default function ScoreHero({
  result,
  income,
  totalExpenses,
  budgetGrade,
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
  const dimensions = (result.dimensions || []).map((d) => ({
    key: d.key,
    label: d.label,
    score: d.score,
    grade: d.grade,
    excluded: excluded.has(d.key),
    summary: d.summary || d.detail,
  }));

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {checkupBusy ? (
        <div style={{ fontSize: 12, color: '#93c5fd', opacity: 0.9 }}>Recalculating score…</div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.65 }}>Live score — updates as you edit Finances</div>
      )}
      <ScoreBreakdownShowcase
        overallScore={result.overallScore}
        headline={result.headline}
        dimensions={dimensions}
        badge="Financial Checkup Score"
        large
        isMobile={isMobile}
        renderDetail={(dim) => (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {dim.label}{' '}
              <span style={{ color: scoreBarColor(dim.score) }}>{Math.round(dim.score)}</span>
              {dim.grade ? <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 13 }}> ({dim.grade})</span> : null}
            </div>
            {dim.summary ? (
              <p style={{ margin: 0, fontSize: 14, opacity: 0.88, lineHeight: 1.5 }}>{dim.summary}</p>
            ) : null}
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Ledger: ${Number(income || 0).toLocaleString()} in · ${Number(totalExpenses || 0).toLocaleString()} out · grade <strong>{budgetGrade}</strong>
            </div>
            <button type="button" onClick={onGoFinances} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textAlign: 'left', fontSize: 13 }}>
              Improve this in Finances →
            </button>
          </div>
        )}
      />
    </div>
  );
}
