import { useEffect, useState } from 'react';
import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
import PrioritiesPanel from './PrioritiesPanel';
import RecommendationTimeline from './RecommendationTimeline';
import { ProjectionsPane, PlanOutlookContent } from './PlanOutlookCard';
import ExpandablePanel from './ExpandablePanel';
import BadgeRewardsPanel from './BadgeRewardsPanel';
import LeaderboardSnapshot from './LeaderboardSnapshot';
import { goalLabel } from './goalResources';

function LedgerSnapshot({ income, totalExpenses, cardSoftStyle }) {
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const net = inc - exp;
  const isDeficit = net < 0;
  const fmt = (n) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>This month</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>Income</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4, color: '#86efac' }}>{fmt(inc)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>Expenses</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4, color: '#fca5a5' }}>{fmt(exp)}</div>
        </div>
      </div>
      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(148,163,184,0.15)' }}>
        <div style={{ fontSize: 11, opacity: 0.65 }}>{isDeficit ? 'Deficit' : net > 0 ? 'Surplus' : 'Even'}</div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 24,
            marginTop: 4,
            color: isDeficit ? '#fca5a5' : net > 0 ? '#86efac' : '#94a3b8',
          }}
        >
          {isDeficit ? `−${fmt(net)}` : fmt(net)}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ primaryGoal, cardSoftStyle }) {
  if (!primaryGoal) return null;
  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem' }}>
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your goal</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6, lineHeight: 1.3 }}>{goalLabel(primaryGoal)}</div>
    </div>
  );
}

function ProfileSnapshot({ summary, cardSoftStyle }) {
  const fmt = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const insuranceLabel =
    summary.insuranceCount >= 6 ? 'Full coverage' : summary.insuranceCount > 0 ? `${summary.insuranceCount}/6 types` : 'None set';

  const rows = [
    { label: 'Total debt', value: fmt(summary.totalDebt), color: summary.totalDebt > 0 ? '#fca5a5' : '#94a3b8' },
    { label: 'Emergency fund', value: fmt(summary.emergencyFund), color: summary.emergencyFund > 0 ? '#86efac' : '#94a3b8' },
    { label: 'Investments', value: fmt(summary.investmentTotal), color: summary.investmentTotal > 0 ? '#93c5fd' : '#94a3b8' },
    { label: 'Retirement', value: fmt(summary.retirementBalance), color: summary.retirementBalance > 0 ? '#c4b5fd' : '#94a3b8' },
    { label: 'Insurance', value: insuranceLabel, color: summary.insuranceCount >= 6 ? '#fde68a' : summary.insuranceCount > 0 ? '#fbbf24' : '#94a3b8' },
  ];

  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profile snapshot</div>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>{row.label}</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: row.color, textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function planOutlookHint(checkupResult, forecastData, isPro) {
  const parts = [];
  if (checkupResult?.actionPlan?.length) parts.push(`${checkupResult.actionPlan.length} priorities`);
  if (checkupResult?.recommendationTimeline?.some((p) => p.items?.length)) parts.push('timeline');
  if (forecastData?.longTermHealth) parts.push(forecastData.longTermHealth.status);
  else if (isPro) parts.push('projections');
  else parts.push('projections (Pro)');
  return `${parts.join(' · ')} — tap to expand`;
}

export default function OverviewDashboard({
  isMobile,
  isDesktop,
  checkupResult,
  income,
  totalExpenses,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  checkupBusy,
  onGoFinances,
  onGoTab,
  onGoProgress,
  onGuideNavigate,
  primaryGoal,
  profileSummary,
  userXp,
  rankData,
  rankBusy,
  rankErr,
  isPro,
  forecastBusy,
  forecastErr,
  forecastData,
  businessDocs,
  onGoPlan,
  onRefreshProjections,
}) {
  const [planOutlookOpen, setPlanOutlookOpen] = useState(false);

  useEffect(() => {
    function openPlanOutlook() {
      setPlanOutlookOpen(true);
    }
    window.addEventListener('fc-focus-outlook', openPlanOutlook);
    return () => window.removeEventListener('fc-focus-outlook', openPlanOutlook);
  }, []);

  const gridOverview = isMobile
    ? '1fr'
    : isDesktop
      ? 'minmax(0, 1.15fr) minmax(300px, 420px)'
      : '1fr 1fr';

  const scoreColumn = (
    <div style={{ display: 'grid', gap: 16, minWidth: 0, width: '100%' }}>
      <ScoreHero
        result={checkupResult}
        income={income}
        totalExpenses={totalExpenses}
        isMobile={isMobile}
        cardSoftStyle={cardSoftStyle}
        checkupBusy={checkupBusy}
        onGoFinances={onGoFinances}
      />
      <GuidePanel
        checkupResult={checkupResult}
        primaryGoal={primaryGoal}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        onNavigate={onGuideNavigate}
      />
    </div>
  );

  const sideColumn = (
    <div style={{ display: 'grid', gap: 12, minWidth: 0, alignContent: 'start' }}>
      {userXp != null ? (
        <BadgeRewardsPanel userXp={userXp} cardSoftStyle={cardSoftStyle} />
      ) : null}

      <GoalCard primaryGoal={primaryGoal} cardSoftStyle={cardSoftStyle} />

      <LedgerSnapshot income={income} totalExpenses={totalExpenses} cardSoftStyle={cardSoftStyle} />

      {profileSummary ? <ProfileSnapshot summary={profileSummary} cardSoftStyle={cardSoftStyle} /> : null}

      <LeaderboardSnapshot
        rankData={rankData}
        busy={rankBusy}
        error={rankErr}
        cardSoftStyle={cardSoftStyle}
      />
    </div>
  );

  const insightGrid = isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))';

  const planOutlookBody = (
    <PlanOutlookContent
      checkupResult={checkupResult}
      isPro={isPro}
      isMobile={isMobile}
      cardSoftStyle={cardSoftStyle}
      btnNeutral={btnNeutral}
      onGoFinances={onGoFinances}
      onGoPlan={onGoPlan}
      forecastBusy={forecastBusy}
      forecastErr={forecastErr}
      forecastData={forecastData}
      businessDocs={businessDocs}
      onRefreshProjections={onRefreshProjections}
    />
  );

  const insightPanels = [
    {
      key: 'plan-outlook',
      accent: 'outlook',
      title: 'Plan & outlook',
      hint: planOutlookHint(checkupResult, forecastData, isPro),
      fullWidth: true,
      panelId: 'plan-outlook-card',
      controlledOpen: planOutlookOpen,
      onOpenChange: setPlanOutlookOpen,
      body: planOutlookBody,
    },
    checkupResult?.actionPlan?.length
      ? {
          key: 'priorities',
          accent: 'priorities',
          title: 'Top priorities',
          hint: `${checkupResult.actionPlan.length} actions — tap to expand`,
          body: (
            <PrioritiesPanel
              actionPlan={checkupResult.actionPlan}
              cardSoftStyle={cardSoftStyle}
              onGoFinances={onGoFinances}
              btnNeutral={btnNeutral}
              bare
            />
          ),
        }
      : null,
    checkupResult?.recommendationTimeline?.length
      ? {
          key: 'timeline',
          accent: 'timeline',
          title: 'Action timeline',
          hint: 'Now, this month, and long-term — tap to expand',
          body: (
            <RecommendationTimeline
              timeline={checkupResult.recommendationTimeline}
              cardSoftStyle={cardSoftStyle}
              isMobile={isMobile}
              bare
            />
          ),
        }
      : null,
    {
      key: 'projections',
      accent: 'projections',
      title: 'Projections & long-term health',
      hint: forecastData?.longTermHealth
        ? `${forecastData.longTermHealth.status} — tap to expand`
        : isPro
          ? '3 / 6 / 12-month outlook — tap to expand'
          : 'Pro — tap to expand',
      body: (
        <ProjectionsPane
          isPro={isPro}
          isMobile={isMobile}
          forecastBusy={forecastBusy}
          forecastErr={forecastErr}
          forecastData={forecastData}
          businessDocs={businessDocs}
          cardSoftStyle={cardSoftStyle}
          onGoPlan={onGoPlan}
        />
      ),
    },
    checkupResult?.improvementRoadmap
      ? {
          key: 'roadmap',
          accent: 'roadmap',
          title: 'Improvement roadmap',
          hint: 'Security vs wealth tracks — tap to expand',
          body: (
            <ImprovementRoadmap
              roadmap={checkupResult.improvementRoadmap}
              compact
              cardSoftStyle={cardSoftStyle}
              onGoTab={onGoTab}
              btnNeutral={btnNeutral}
              bare
            />
          ),
        }
      : null,
    checkupResult?.scoreExplanation
      ? {
          key: 'score',
          accent: 'score',
          title: 'Score breakdown',
          hint: 'Security vs long-term wealth — tap to expand',
          body: (
            <ScoreExplainer
              explanation={checkupResult.scoreExplanation}
              isMobile={isMobile}
              cardSoftStyle={cardSoftStyle}
              compact={false}
              bare
              onGoTab={onGoTab}
              btnNeutral={btnNeutral}
            />
          ),
        }
      : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: isDesktop ? 24 : 18, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridOverview, gap: isDesktop ? 20 : 16, alignItems: 'start' }}>
        {scoreColumn}
        {sideColumn}
      </div>

      {insightPanels.length ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Your financial plan</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8', lineHeight: 1.45 }}>
              Six quick views — priorities, timeline, projections, roadmap, and scores. Open any card to dive in.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: insightGrid,
              gap: 14,
              alignItems: 'stretch',
            }}
          >
            {insightPanels.map((panel) => (
              <div
                key={panel.key}
                style={panel.fullWidth && !isMobile ? { gridColumn: '1 / -1' } : undefined}
              >
                <ExpandablePanel
                  title={panel.title}
                  hint={panel.hint}
                  accent={panel.accent}
                  gridCard
                  cardSoftStyle={cardSoftStyle}
                  panelId={panel.panelId}
                  open={panel.controlledOpen}
                  onOpenChange={panel.onOpenChange}
                >
                  {panel.body}
                </ExpandablePanel>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
