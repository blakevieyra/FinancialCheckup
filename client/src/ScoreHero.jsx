import ScoreBreakdownShowcase from './ScoreBreakdownShowcase';
import { scoreBarColor } from './theme';

export default function ScoreHero({
  result,
  income,
  totalExpenses,
  budgetGrade,
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
      <div style={{ ...cardSoftStyle, padding: '1.25rem', display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 20 }}>Your financial score</div>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45, maxWidth: 560 }}>
          Enter data on <button type="button" onClick={onGoMoney} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Money</button>
          {' '}and <button type="button" onClick={onGoProfile} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Profile</button>, then calculate.
        </p>
        <button type="button" onClick={onUpdateScore} disabled={updateBusy} style={{ ...btnPrimary, justifySelf: 'start' }}>
          {updateBusy ? 'Calculating…' : 'Calculate my score'}
        </button>
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

  const sec = result.scoreExplanation?.securityScore ?? result.improvementRoadmap?.securityScore;
  const wealth = result.scoreExplanation?.wealthScore ?? result.improvementRoadmap?.wealthScore;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
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
              {dim.excluded ? (
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.65 }}>excluded from total</span>
              ) : null}
            </div>
            {dim.summary ? (
              <p style={{ margin: 0, fontSize: 14, opacity: 0.88, lineHeight: 1.5 }}>{dim.summary}</p>
            ) : null}
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Budget ledger: ${Number(income || 0).toLocaleString()} in · ${Number(totalExpenses || 0).toLocaleString()} out · grade <strong>{budgetGrade}</strong>
            </div>
          </div>
        )}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
          {sec != null ? (
            <span style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)' }}>
              Security <strong>{Math.round(sec)}</strong>
            </span>
          ) : null}
          {wealth != null ? (
            <span style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)' }}>
              Long-term <strong>{Math.round(wealth)}</strong>
            </span>
          ) : null}
        </div>
        <button type="button" onClick={onUpdateScore} disabled={updateBusy} style={{ ...btnPrimary }}>
          {updateBusy ? 'Updating…' : 'Update score'}
        </button>
      </div>
    </div>
  );
}
