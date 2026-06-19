import { MORE_TOOL_SECTIONS, RESOURCE_LINKS, CHECKUP_DIMENSIONS } from './planConstants';

function ProBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 99,
        background: 'rgba(77,166,255,0.18)',
        color: '#93c5fd',
        border: '1px solid rgba(77,166,255,0.35)',
      }}
    >
      Pro
    </span>
  );
}

function ToolCard({ tool, locked, onAction, btnNeutral, btnPrimary, busy, busyLabel }) {
  return (
    <div
      style={{
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 12,
        padding: '0.85rem 1rem',
        display: 'grid',
        gap: 8,
        background: 'rgba(15,23,42,0.45)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{tool.label}</div>
      <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>{tool.desc}</div>
      <button
        type="button"
        disabled={locked || busy}
        onClick={onAction}
        style={{ ...(locked ? btnNeutral : btnPrimary), justifySelf: 'start', opacity: locked ? 0.55 : 1 }}
      >
        {busy && busyLabel ? busyLabel : locked ? 'Upgrade in Plan tab' : tool.label}
      </button>
    </div>
  );
}

export default function MoreToolsPanel({
  isPro,
  isMobile,
  isTablet,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  onGoPlan,
  exportBusy,
  pdfBusy,
  businessPdfBusy,
  busy,
  onExportCsv,
  onExportPdf,
  onExportBusinessPdf,
  profile,
  onProfileChange,
  aiBusy,
  onAiInsights,
  aiError,
  insights,
  adviceBusy,
  onAdvice,
  adviceErr,
  adviceData,
  expertBusy,
  onExpert,
  expertError,
  expertData,
  forecastBusy,
  forecastErr,
  forecastData,
  businessDocs,
  onOpenProjections,
}) {
  const grid2 = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';
  const gridDims = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';

  const toolActions = {
    csv: onExportCsv,
    pdf: onExportPdf,
    bizpdf: onExportBusinessPdf,
    ai: onAiInsights,
    tips: onAdvice,
    expert: onExpert,
    forecast: onOpenProjections,
    longterm: onOpenProjections,
    bizdocs: onOpenProjections,
  };

  const toolBusy = {
    csv: exportBusy,
    pdf: pdfBusy,
    bizpdf: businessPdfBusy,
    ai: aiBusy,
    tips: adviceBusy,
    expert: expertBusy,
  };

  const toolBusyLabel = {
    csv: 'Exporting…',
    pdf: 'Building PDF…',
    bizpdf: 'Building PDF…',
    ai: 'Generating…',
    tips: 'Loading…',
    expert: 'Loading…',
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          ...cardStyle,
          padding: isMobile ? '1.1rem' : '1.35rem 1.5rem',
          background: 'linear-gradient(145deg, rgba(16,185,129,0.12), rgba(15,23,42,0.78))',
          border: '1px solid rgba(34,197,94,0.22)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#86efac', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tools & resources
        </div>
        <h2 style={{ margin: '6px 0 8px', fontSize: isMobile ? '1.35rem' : '1.65rem', lineHeight: 1.2 }}>
          Reports, AI insights & expert resources
        </h2>
        <p style={{ margin: 0, opacity: 0.88, fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>
          Everything beyond your daily checkup — exports, AI advice, projections, and trusted external links.
          {!isPro ? (
            <>
              {' '}
              <button type="button" onClick={onGoPlan} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Upgrade in Plan
              </button>{' '}
              to unlock Pro tools.
            </>
          ) : null}
        </p>
      </div>

      <div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>6 dimensions in every checkup</div>
        <div style={{ display: 'grid', gridTemplateColumns: gridDims, gap: 10 }}>
          {CHECKUP_DIMENSIONS.map((f) => (
            <div key={f.title} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <span style={{ fontSize: 18, marginRight: 6 }}>{f.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</span>
              <div style={{ fontSize: 12, opacity: 0.82, marginTop: 4, lineHeight: 1.35 }}>{f.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {MORE_TOOL_SECTIONS.map((section) => (
        <div key={section.id} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{section.title}</div>
            {section.pro ? <ProBadge /> : null}
          </div>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.45 }}>{section.intro}</p>
          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            {section.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                locked={section.pro && !isPro}
                onAction={section.pro && !isPro ? onGoPlan : toolActions[tool.id]}
                btnNeutral={btnNeutral}
                btnPrimary={btnPrimary}
                busy={toolBusy[tool.id] || busy}
                busyLabel={toolBusyLabel[tool.id]}
              />
            ))}
          </div>
          {section.id === 'ai' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={profile} onChange={(e) => onProfileChange(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }}>
                <option value="personal">Personal profile</option>
                <option value="business">Business profile</option>
                <option value="organizational">Organizational profile</option>
              </select>
              {aiError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{aiError}</div> : null}
              {insights?.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {insights.map((ins, idx) => (
                    <div key={`${ins.title}-${idx}`} style={{ ...cardSoftStyle, padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700 }}>{ins.title}</div>
                      <div style={{ marginTop: 4, opacity: 0.9, fontSize: 14, lineHeight: 1.4 }}>{ins.message}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {adviceErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{adviceErr}</div> : null}
              {adviceData?.advice ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    Tips for {adviceData.month}
                    {adviceData.metrics?.healthScore != null ? (
                      <> · health score <strong>{adviceData.metrics.healthScore}</strong></>
                    ) : null}
                  </div>
                  {[...(adviceData.advice.internal || []), ...(adviceData.advice.external || [])].map((tip, i) => (
                    <div key={`tip-${i}`} style={{ ...cardSoftStyle, padding: '0.75rem', fontSize: 14, lineHeight: 1.45 }}>
                      {tip}
                    </div>
                  ))}
                </div>
              ) : null}
              {expertError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{expertError}</div> : null}
              {expertData?.expert ? (
                <div style={{ ...cardSoftStyle, padding: '0.85rem', fontSize: 14, lineHeight: 1.45, display: 'grid', gap: 8 }}>
                  {expertData.expert.headline ? (
                    <div><strong>{expertData.expert.headline}</strong></div>
                  ) : null}
                  {expertData.expert.executiveVerdict ? (
                    <div style={{ opacity: 0.9 }}>{expertData.expert.executiveVerdict}</div>
                  ) : null}
                  {expertData.expert.personalizedPriorities?.length ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {expertData.expert.personalizedPriorities.slice(0, 5).map((p, i) => (
                        <li key={`ep-${i}`}>{p}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {section.id === 'projections' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {forecastBusy ? <div style={{ opacity: 0.8, fontSize: 14 }}>Building financial outlook…</div> : null}
              {forecastErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{forecastErr}</div> : null}
              {!isPro ? (
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
                  Projections use your trailing history for 3, 6, and 12 month outcomes plus long-term health estimates.
                </p>
              ) : null}
              {isPro && forecastData?.outcomes?.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  {forecastData.outcomes.map((o) => (
                    <div key={o.months} style={{ ...cardSoftStyle, padding: '0.75rem', fontSize: 13 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{o.months}-month outlook</div>
                      <div style={{ opacity: 0.8, marginTop: 2 }}>Through {o.endMonth}</div>
                      <div style={{ marginTop: 8 }}>Income: <strong>${Number(o.projectedIncome).toLocaleString()}</strong></div>
                      <div>Expenses: <strong>${Number(o.projectedExpenses).toLocaleString()}</strong></div>
                      <div>Net: <strong>${Number(o.projectedNet).toLocaleString()}</strong></div>
                    </div>
                  ))}
                </div>
              ) : null}
              {isPro && forecastData?.longTermHealth ? (
                <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700 }}>
                    Long-term health: <span style={{ textTransform: 'capitalize' }}>{forecastData.longTermHealth.status}</span>
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6, lineHeight: 1.45 }}>{forecastData.longTermHealth.summary}</div>
                </div>
              ) : null}
              {isPro && businessDocs ? (
                <div style={{ ...cardSoftStyle, padding: '0.85rem', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Business documents (generated)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Balance sheet</div>
                      <div>Assets: ${Number(businessDocs.balanceSheet?.assets?.totalAssets || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>Income statement</div>
                      <div>Net: ${Number(businessDocs.incomeStatement?.netIncome || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>Cash flow</div>
                      <div>Trend: {businessDocs.cashFlowSummary?.trend || 'n/a'}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <div style={{ ...cardStyle, display: 'grid', gap: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Authoritative resources</div>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.45 }}>
          Trusted financial education for individuals and businesses. Verify local eligibility and current guidance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Personal finance</div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.55, fontSize: 14 }}>
              {RESOURCE_LINKS.personal.map((l) => (
                <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div style={{ ...cardSoftStyle, padding: '0.85rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Business & organizations</div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.55, fontSize: 14 }}>
              {RESOURCE_LINKS.business.map((l) => (
                <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
