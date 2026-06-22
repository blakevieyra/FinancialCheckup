import { MORE_TOOL_SECTIONS, RESOURCE_LINKS } from './planConstants';
import SpecialistReportsGrid from './SpecialistReportsGrid';
import AiInsightsPanel from './AiInsightsPanel';
import ExpertBriefingPanel from './ExpertBriefingPanel';
import ComprehensiveReportPanel from './ComprehensiveReportPanel';

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
        {busy && busyLabel ? busyLabel : locked ? 'Upgrade in Account' : tool.label}
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
  aiPlan,
  expertBusy,
  onExpert,
  expertError,
  expertData,
  comprehensiveData,
  comprehensiveBusy,
  comprehensiveError,
  onComprehensiveReport,
  onPrintAiReport,
  onEmailAiReport,
  onPrintExpertReport,
  onEmailExpertReport,
  onPrintComprehensiveReport,
  onEmailComprehensiveReport,
  aiEmailBusy,
  expertEmailBusy,
  comprehensiveEmailBusy,
  aiEmailNote,
  expertEmailNote,
  comprehensiveEmailNote,
  overallScore,
  budgetGrade,
  forecastBusy,
  forecastErr,
  forecastData,
  businessDocs,
  onOpenProjections,
  onScrollToProjections,
  checkupResult,
  month,
  token,
  primaryGoal,
  income,
  totalExpenses,
  extendedProfile,
  userEmail,
}) {
  const grid2 = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';

  const toolActions = {
    csv: onExportCsv,
    pdf: onExportPdf,
    bizpdf: onExportBusinessPdf,
    ai: onAiInsights,
    expert: onExpert,
    comprehensive: onComprehensiveReport,
  };

  const toolBusy = {
    csv: exportBusy,
    pdf: pdfBusy,
    bizpdf: businessPdfBusy,
    ai: aiBusy,
    expert: expertBusy,
    comprehensive: comprehensiveBusy,
  };

  const toolBusyLabel = {
    csv: 'Exporting…',
    pdf: 'Building PDF…',
    bizpdf: 'Building PDF…',
    ai: 'Generating insights…',
    expert: 'Building briefing…',
    comprehensive: 'Building report…',
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
                Upgrade in Account
              </button>{' '}
              to unlock Pro tools.
            </>
          ) : null}
        </p>
      </div>

      {MORE_TOOL_SECTIONS.map((section) => (
        <div key={section.id} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{section.title}</div>
            {section.pro ? <ProBadge /> : null}
          </div>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.45 }}>{section.intro}</p>
          {section.tools.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            {section.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                locked={section.pro && !isPro}
                onAction={section.pro && !isPro ? onGoPlan : () => toolActions[tool.id]?.()}
                btnNeutral={btnNeutral}
                btnPrimary={btnPrimary}
                busy={toolBusy[tool.id] || busy}
                busyLabel={toolBusyLabel[tool.id]}
              />
            ))}
          </div>
          ) : null}
          {section.id === 'ai' ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <select value={profile} onChange={(e) => onProfileChange(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }}>
                <option value="personal">Personal profile</option>
                <option value="business">Business profile</option>
                <option value="organizational">Organizational profile</option>
              </select>

              {aiError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{aiError}</div> : null}
              {aiPlan ? (
                <AiInsightsPanel
                  aiPlan={aiPlan}
                  cardSoftStyle={cardSoftStyle}
                  isMobile={isMobile}
                  onPrint={onPrintAiReport}
                  onEmail={onEmailAiReport}
                  emailBusy={aiEmailBusy}
                  emailNote={aiEmailNote}
                  btnNeutral={btnNeutral}
                />
              ) : null}

              {expertError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{expertError}</div> : null}
              {expertData?.expert ? (
                <ExpertBriefingPanel
                  expertData={expertData}
                  cardSoftStyle={cardSoftStyle}
                  onPrint={onPrintExpertReport}
                  onEmail={onEmailExpertReport}
                  emailBusy={expertEmailBusy}
                  emailNote={expertEmailNote}
                  btnNeutral={btnNeutral}
                />
              ) : null}

              {comprehensiveError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{comprehensiveError}</div> : null}
              {comprehensiveData ? (
                <ComprehensiveReportPanel
                  data={comprehensiveData}
                  month={month}
                  overallScore={overallScore}
                  grade={budgetGrade}
                  income={income}
                  totalExpenses={totalExpenses}
                  onPrint={onPrintComprehensiveReport}
                  onEmail={onEmailComprehensiveReport}
                  emailBusy={comprehensiveEmailBusy}
                  emailNote={comprehensiveEmailNote}
                  btnNeutral={btnNeutral}
                  cardSoftStyle={cardSoftStyle}
                />
              ) : null}

              <div style={{ display: 'grid', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Dimension AI reports</div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
                    Deep-dive reports for each checkup category — budget, debt, insurance, investments, savings, and retirement.
                  </p>
                </div>
                {checkupResult ? (
                  <SpecialistReportsGrid
                    result={checkupResult}
                    isTablet={isTablet}
                    cardSoftStyle={cardSoftStyle}
                    token={token}
                    month={month}
                    profile={profile}
                    primaryGoal={primaryGoal}
                    isPro={isPro}
                    onGoPlan={onGoPlan}
                    btnPrimary={btnPrimary}
                    btnNeutral={btnNeutral}
                    income={income}
                    totalExpenses={totalExpenses}
                    extended={extendedProfile}
                    accountEmail={userEmail}
                  />
                ) : (
                  <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>
                    Complete your profile on Finances to generate scores, then return here for per-dimension AI reports.
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {section.id === 'projections' ? (
            <div id="projections-results" style={{ display: 'grid', gap: 12 }}>
              {forecastBusy ? <div style={{ opacity: 0.8, fontSize: 14 }}>Building financial outlook…</div> : null}
              {forecastErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{forecastErr}</div> : null}
              {!isPro ? (
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
                  Upgrade in Account to unlock projections. Data loads automatically when you have Pro access.
                </p>
              ) : null}
              {isPro && !forecastBusy && !forecastData && !forecastErr ? (
                <div style={{ opacity: 0.8, fontSize: 14 }}>Loading your financial outlook…</div>
              ) : null}
              {isPro && forecastData?.outcomes?.length ? (
                <div id="projections-outcomes" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
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
                <div id="longterm-health" style={{ ...cardSoftStyle, padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700 }}>
                    Long-term health: <span style={{ textTransform: 'capitalize' }}>{forecastData.longTermHealth.status}</span>
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6, lineHeight: 1.45 }}>{forecastData.longTermHealth.summary}</div>
                </div>
              ) : null}
              {isPro && businessDocs ? (
                <div id="biz-docs" style={{ ...cardSoftStyle, padding: '0.85rem', fontSize: 13 }}>
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
