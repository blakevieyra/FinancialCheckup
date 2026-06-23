import { MORE_TOOL_SECTIONS, RESOURCE_LINKS } from './planConstants';
import SpecialistReportsGrid from './SpecialistReportsGrid';
import AdviceToolsGrid from './AdviceToolsGrid';
import PlanOutlookCard from './PlanOutlookCard';
import { TOOL_ETA_SECONDS, useGenerationTimer } from './useGenerationTimer';

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

function ToolCard({ tool, locked, onAction, btnNeutral, btnPrimary, busy, busyLabel, etaSeconds }) {
  const { label: timerLabel } = useGenerationTimer(busy, etaSeconds || 45);

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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          disabled={locked || busy}
          onClick={onAction}
          style={{ ...(locked ? btnNeutral : btnPrimary), opacity: locked ? 0.55 : 1 }}
        >
          {busy && busyLabel ? busyLabel : locked ? 'Upgrade in Account' : tool.label}
        </button>
        {busy && !locked ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#93c5fd',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
            aria-live="polite"
          >
            {timerLabel}
          </span>
        ) : null}
      </div>
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
  onGoFinances,
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
  aiReportId,
  expertBusy,
  onExpert,
  expertError,
  expertData,
  expertReportId,
  comprehensiveData,
  comprehensiveBusy,
  comprehensiveError,
  onComprehensiveReport,
  comprehensiveReportId,
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
  };

  const toolBusy = {
    csv: exportBusy,
    pdf: pdfBusy,
    bizpdf: businessPdfBusy,
  };

  const toolBusyLabel = {
    csv: 'Exporting…',
    pdf: 'Building PDF…',
    bizpdf: 'Building PDF…',
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

      <PlanOutlookCard
        checkupResult={checkupResult}
        isPro={isPro}
        isMobile={isMobile}
        cardStyle={cardStyle}
        cardSoftStyle={cardSoftStyle}
        btnNeutral={btnNeutral}
        onGoFinances={onGoFinances}
        onGoPlan={onGoPlan}
        forecastBusy={forecastBusy}
        forecastErr={forecastErr}
        forecastData={forecastData}
        businessDocs={businessDocs}
        onRefreshProjections={onOpenProjections}
      />

      {MORE_TOOL_SECTIONS.map((section) => (
        <div key={section.id} style={{ ...cardStyle, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{section.title}</div>
            {section.pro ? <ProBadge /> : null}
          </div>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85, lineHeight: 1.45 }}>{section.intro}</p>
          {section.id === 'ai' ? (
            <select
              value={profile}
              onChange={(e) => onProfileChange(e.target.value)}
              style={{ ...inputStyle, maxWidth: 320 }}
              aria-label="Profile type for AI advice"
            >
              <option value="personal">Personal profile</option>
              <option value="business">Business profile</option>
              <option value="organizational">Organizational profile</option>
            </select>
          ) : null}
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
                etaSeconds={TOOL_ETA_SECONDS[tool.id]}
              />
            ))}
          </div>
          ) : null}
          {section.id === 'ai' ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <AdviceToolsGrid
                isTablet={isTablet}
                cardSoftStyle={cardSoftStyle}
                token={token}
                isPro={isPro}
                onGoPlan={onGoPlan}
                btnPrimary={btnPrimary}
                btnNeutral={btnNeutral}
                isMobile={isMobile}
                month={month}
                overallScore={overallScore}
                budgetGrade={budgetGrade}
                income={income}
                totalExpenses={totalExpenses}
                checkupResult={checkupResult}
                aiPlan={aiPlan}
                aiBusy={aiBusy}
                aiError={aiError}
                onAiInsights={onAiInsights}
                aiReportId={aiReportId}
                onPrintAiReport={onPrintAiReport}
                onEmailAiReport={onEmailAiReport}
                aiEmailBusy={aiEmailBusy}
                aiEmailNote={aiEmailNote}
                expertData={expertData}
                expertBusy={expertBusy}
                expertError={expertError}
                onExpert={onExpert}
                expertReportId={expertReportId}
                onPrintExpertReport={onPrintExpertReport}
                onEmailExpertReport={onEmailExpertReport}
                expertEmailBusy={expertEmailBusy}
                expertEmailNote={expertEmailNote}
                comprehensiveData={comprehensiveData}
                comprehensiveBusy={comprehensiveBusy}
                comprehensiveError={comprehensiveError}
                onComprehensiveReport={onComprehensiveReport}
                comprehensiveReportId={comprehensiveReportId}
                onPrintComprehensiveReport={onPrintComprehensiveReport}
                onEmailComprehensiveReport={onEmailComprehensiveReport}
                comprehensiveEmailBusy={comprehensiveEmailBusy}
                comprehensiveEmailNote={comprehensiveEmailNote}
              />

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
