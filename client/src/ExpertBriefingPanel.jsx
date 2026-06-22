import AdviceReportToolbar from './AdviceReportToolbar';

export default function ExpertBriefingPanel({
  expertData,
  onPrint,
  onEmail,
  emailBusy,
  emailNote,
  btnNeutral,
  cardSoftStyle,
}) {
  const e = expertData?.expert;
  if (!e) return null;

  return (
    <div id="expert-briefing-report" style={{ display: 'grid', gap: 12 }}>
      <AdviceReportToolbar
        onPrint={onPrint}
        onEmail={onEmail}
        emailBusy={emailBusy}
        emailNote={emailNote}
        btnNeutral={btnNeutral}
      />
      {expertData?.snapshot ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, fontSize: 13 }}>
          <div style={{ ...cardSoftStyle, padding: '0.55rem' }}>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Income</div>
            <div style={{ fontWeight: 700 }}>${Number(expertData.snapshot.income).toLocaleString()}</div>
          </div>
          <div style={{ ...cardSoftStyle, padding: '0.55rem' }}>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Expenses</div>
            <div style={{ fontWeight: 700 }}>${Number(expertData.snapshot.totalExpenses).toLocaleString()}</div>
          </div>
          <div style={{ ...cardSoftStyle, padding: '0.55rem' }}>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Expense ratio</div>
            <div style={{ fontWeight: 700, color: Number(expertData.snapshot.expenseRatio) > 100 ? '#fca5a5' : '#86efac' }}>
              {Number(expertData.snapshot.expenseRatio).toFixed(1)}%
            </div>
          </div>
        </div>
      ) : null}
      {e.headline ? (
        <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.35 }}>{e.headline}</div>
        </div>
      ) : null}
      {e.executiveVerdict ? (
        <div style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.92 }}>{e.executiveVerdict}</div>
      ) : null}
      {e.benchmarkContext ? (
        <div style={{ ...cardSoftStyle, padding: '0.75rem', fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Benchmark context</div>
          {e.benchmarkContext}
        </div>
      ) : null}
      {e.personalizedPriorities?.length ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Personalized priorities</div>
          <ol style={{ margin: 0, paddingLeft: '1.15rem', fontSize: 14, lineHeight: 1.5 }}>
            {e.personalizedPriorities.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </div>
      ) : null}
      {e.riskWatchouts?.length ? (
        <div style={{ ...cardSoftStyle, padding: '0.75rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Risk watchouts</div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 14, lineHeight: 1.45 }}>
            {e.riskWatchouts.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      ) : null}
      {e.disclaimer ? <div style={{ fontSize: 11, opacity: 0.6 }}>{e.disclaimer}</div> : null}
    </div>
  );
}
