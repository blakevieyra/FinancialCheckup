import AdviceReportToolbar from './AdviceReportToolbar';

function ResourceList({ resources }) {
  if (!resources?.length) return null;
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: '1.1rem', fontSize: 13, lineHeight: 1.55 }}>
      {resources.map((s, i) => (
        <li key={`${s.url}-${i}`}>
          <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontWeight: 600 }}>
            {s.title || s.url}
          </a>
          {s.category ? <span style={{ opacity: 0.65 }}> · {s.category}</span> : null}
          {s.why ? <div style={{ opacity: 0.85, marginTop: 2 }}>{s.why}</div> : null}
        </li>
      ))}
    </ul>
  );
}

export default function ComprehensiveReportPanel({
  data,
  month,
  overallScore,
  grade,
  income,
  totalExpenses,
  onPrint,
  onEmail,
  emailBusy,
  emailNote,
  btnNeutral,
  cardSoftStyle,
}) {
  if (!data) return null;

  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const ieRatio = exp > 0 ? inc / exp : null;
  const healthy = inc > 0 && inc >= exp;

  return (
    <div id="comprehensive-report" style={{ display: 'grid', gap: 14 }}>
      <AdviceReportToolbar
        onPrint={onPrint}
        onEmail={onEmail}
        emailBusy={emailBusy}
        emailNote={emailNote}
        btnNeutral={btnNeutral}
      />
      {data.emailSent ? (
        <div style={{ fontSize: 12, color: '#86efac' }}>A copy was emailed to your account address.</div>
      ) : null}
      {(ieRatio != null || overallScore != null) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {overallScore != null ? (
            <div style={{ ...cardSoftStyle, padding: '0.65rem', textAlign: 'center' }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Overall score</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{Math.round(overallScore)}/100</div>
              {grade ? <div style={{ fontSize: 12, opacity: 0.75 }}>Grade {grade}</div> : null}
            </div>
          ) : null}
          {ieRatio != null ? (
            <div style={{ ...cardSoftStyle, padding: '0.65rem', textAlign: 'center', borderColor: healthy ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)' }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Income/expense</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: healthy ? '#86efac' : '#fca5a5' }}>{ieRatio.toFixed(2)}×</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {data.summary ? (
        <div style={{ ...cardSoftStyle, padding: '1rem', fontSize: 15, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Executive summary</div>
          {data.summary}
        </div>
      ) : null}
      {data.report ? (
        <div style={{ ...cardSoftStyle, padding: '1rem', fontSize: 14, lineHeight: 1.55, opacity: 0.92 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Full analysis</div>
          {data.report}
        </div>
      ) : null}
      {data.dimensionAnalysis?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Dimension-by-dimension analysis</div>
          {data.dimensionAnalysis.map((d, i) => (
            <div key={i} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700 }}>
                {d.dimension || d.label} — {Math.round(d.score || 0)}/100
                {d.priority ? <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7, textTransform: 'uppercase' }}>{d.priority}</span> : null}
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6, lineHeight: 1.45 }}>{d.analysis}</div>
            </div>
          ))}
        </div>
      ) : null}
      {data.actionRoadmap?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>30 / 60 / 90-day action roadmap</div>
          {data.actionRoadmap.map((block, i) => (
            <div key={i} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, color: '#93c5fd' }}>{block.timeframe || block.phase}</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: '1.15rem', fontSize: 14, lineHeight: 1.45 }}>
                {(block.actions || []).map((a, j) => <li key={j}>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {data.riskWatchouts?.length ? (
        <div style={{ ...cardSoftStyle, padding: '0.85rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Risk watchouts</div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 14, lineHeight: 1.45 }}>
            {data.riskWatchouts.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      ) : null}
      {data.advice?.length ? (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Strategic advice</div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 14, lineHeight: 1.45 }}>
            {data.advice.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      ) : null}
      {data.primaryResources?.length ? (
        <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Primary resources</div>
          <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.8 }}>Authoritative guides matched to your situation — verify eligibility for your state.</p>
          <ResourceList resources={data.primaryResources} />
        </div>
      ) : null}
      {data.disclaimer ? (
        <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>{data.disclaimer}</div>
      ) : null}
    </div>
  );
}
