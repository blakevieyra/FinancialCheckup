import AdviceToolPanel from './AdviceToolPanel';
import AiInsightsPanel from './AiInsightsPanel';
import ExpertBriefingPanel from './ExpertBriefingPanel';
import ComprehensiveReportPanel from './ComprehensiveReportPanel';
import { TOOL_ETA_SECONDS } from './useGenerationTimer';

const TOOLS = [
  {
    area: 'ai-insights',
    title: 'AI insights & plan',
    hint: 'Per-category scores, ranked actions, and trusted sources tailored to your profile.',
    busyLabel: 'Generating insights…',
    generateLabel: 'Generate insights & plan',
  },
  {
    area: 'expert',
    title: 'Expert briefing',
    hint: 'Executive summary, risk watchouts, and benchmark comparisons for quick decisions.',
    busyLabel: 'Building briefing…',
    generateLabel: 'Generate expert briefing',
  },
  {
    area: 'comprehensive',
    title: 'Comprehensive report',
    hint: 'Full financial picture with a 30–90 day roadmap and curated primary resources.',
    busyLabel: 'Building report…',
    generateLabel: 'Generate comprehensive report',
    fullWidth: true,
  },
];

export default function AdviceToolsGrid({
  isTablet,
  cardSoftStyle,
  token,
  isPro,
  onGoPlan,
  btnPrimary,
  btnNeutral,
  isMobile,
  month,
  overallScore,
  budgetGrade,
  income,
  totalExpenses,
  checkupResult,
  aiPlan,
  aiBusy,
  aiError,
  onAiInsights,
  aiReportId,
  onPrintAiReport,
  onEmailAiReport,
  aiEmailBusy,
  aiEmailNote,
  expertData,
  expertBusy,
  expertError,
  onExpert,
  expertReportId,
  onPrintExpertReport,
  onEmailExpertReport,
  expertEmailBusy,
  expertEmailNote,
  comprehensiveData,
  comprehensiveBusy,
  comprehensiveError,
  onComprehensiveReport,
  comprehensiveReportId,
  onPrintComprehensiveReport,
  onEmailComprehensiveReport,
  comprehensiveEmailBusy,
  comprehensiveEmailNote,
}) {
  const preview =
    checkupResult?.headline ||
    (checkupResult?.overallScore != null
      ? `Overall score ${Math.round(checkupResult.overallScore)}/100 — generate a tailored report for this month.`
      : 'Complete your Finances checkup to unlock personalized AI reports.');

  const toolState = {
    'ai-insights': {
      data: aiPlan,
      busy: aiBusy,
      error: aiError,
      onGenerate: onAiInsights,
      reportId: aiReportId,
      eta: TOOL_ETA_SECONDS.ai,
    },
    expert: {
      data: expertData,
      busy: expertBusy,
      error: expertError,
      onGenerate: onExpert,
      reportId: expertReportId,
      eta: TOOL_ETA_SECONDS.expert,
    },
    comprehensive: {
      data: comprehensiveData,
      busy: comprehensiveBusy,
      error: comprehensiveError,
      onGenerate: onComprehensiveReport,
      reportId: comprehensiveReportId,
      eta: TOOL_ETA_SECONDS.comprehensive,
    },
  };

  function renderReport(area, data) {
    if (area === 'ai-insights') {
      const plan = data?.categoryPlans || data?.insights ? data : null;
      if (!plan?.summary && !plan?.categoryPlans?.length && !plan?.insights?.length) return null;
      return (
        <AiInsightsPanel
          aiPlan={plan}
          cardSoftStyle={cardSoftStyle}
          isMobile={isMobile}
          onPrint={onPrintAiReport}
          onEmail={onEmailAiReport}
          emailBusy={aiEmailBusy}
          emailNote={aiEmailNote}
          btnNeutral={btnNeutral}
        />
      );
    }
    if (area === 'expert') {
      const wrapped = data?.expert
        ? data
        : data?.headline || data?.executiveVerdict
          ? { expert: data, snapshot: data.snapshot }
          : null;
      if (!wrapped?.expert?.headline && !wrapped?.expert?.executiveVerdict) return null;
      return (
        <ExpertBriefingPanel
          expertData={wrapped}
          cardSoftStyle={cardSoftStyle}
          onPrint={onPrintExpertReport}
          onEmail={onEmailExpertReport}
          emailBusy={expertEmailBusy}
          emailNote={expertEmailNote}
          btnNeutral={btnNeutral}
        />
      );
    }
    if (area === 'comprehensive') {
      const report = data?.dimensionAnalysis || data?.primaryResources ? data : null;
      if (!report?.summary && !report?.report) return null;
      return (
        <ComprehensiveReportPanel
          data={report}
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
      );
    }
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
      {TOOLS.map((tool) => {
        const st = toolState[tool.area];
        return (
          <div key={tool.area} style={tool.fullWidth && !isTablet ? { gridColumn: '1 / -1' } : undefined}>
          <AdviceToolPanel
            area={tool.area}
            title={tool.title}
            hint={tool.hint}
            expectation={tool.hint}
            preview={preview}
            token={token}
            isPro={isPro}
            onGoPlan={onGoPlan}
            busy={st.busy}
            busyLabel={tool.busyLabel}
            generateLabel={tool.generateLabel}
            etaSeconds={st.eta}
            error={st.error}
            onGenerate={st.onGenerate}
            reportData={st.data}
            reportId={st.reportId}
            renderReport={(data) => renderReport(tool.area, data)}
            cardSoftStyle={cardSoftStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
          />
          </div>
        );
      })}
    </div>
  );
}
