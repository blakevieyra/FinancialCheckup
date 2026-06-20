import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
import PrioritiesPanel from './PrioritiesPanel';
import RecommendationTimeline from './RecommendationTimeline';
import ExpandablePanel from './ExpandablePanel';
import BadgeRewardsPanel from './BadgeRewardsPanel';

function StatTile({ label, value, cardSoftStyle }) {
  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', minHeight: 88 }}>
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, marginTop: 6, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

export default function OverviewDashboard({
  isMobile,
  isDesktop,
  checkupResult,
  income,
  totalExpenses,
  budgetGrade,
  cardSoftStyle,
  btnPrimary,
  btnNeutral,
  checkupBusy,
  onGoFinances,
  onGoTab,
  onGoProgress,
  onGuideNavigate,
  primaryGoal,
  savingsAmount,
  savingsRate,
  trajectory,
  topCategory,
  userXp,
}) {
  const gridOverview = isMobile ? '1fr' : isDesktop ? 'minmax(0, 1fr) minmax(280px, 340px)' : '1fr';

  return (
    <div style={{ display: 'grid', gap: isDesktop ? 24 : 18, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridOverview, gap: isDesktop ? 20 : 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <ScoreHero
            result={checkupResult}
            income={income}
            totalExpenses={totalExpenses}
            budgetGrade={budgetGrade}
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

        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          {userXp != null ? (
            <BadgeRewardsPanel userXp={userXp} cardSoftStyle={cardSoftStyle} />
          ) : null}
          <StatTile label="Net surplus" value={`$${savingsAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} cardSoftStyle={cardSoftStyle} />
          <StatTile label="Savings rate" value={`${savingsRate.toFixed(1)}%`} cardSoftStyle={cardSoftStyle} />
          <StatTile label="Trajectory" value={trajectory || '—'} cardSoftStyle={cardSoftStyle} />
          <StatTile label="Top category" value={topCategory || 'N/A'} cardSoftStyle={cardSoftStyle} />
          <div style={{ display: 'grid', gap: 8 }}>
            <button type="button" onClick={onGoFinances} style={{ ...btnNeutral, width: '100%', textAlign: 'left' }}>
              Edit finances & profile →
            </button>
            <button type="button" onClick={onGoProgress} style={{ ...btnNeutral, width: '100%', textAlign: 'left' }}>
              History & charts →
            </button>
          </div>
        </div>
      </div>

      {checkupResult?.actionPlan?.length ? (
        <ExpandablePanel
          title="Top priorities"
          hint={`${checkupResult.actionPlan.length} actions — tap to expand`}
          cardSoftStyle={cardSoftStyle}
        >
          <PrioritiesPanel
            actionPlan={checkupResult.actionPlan}
            cardSoftStyle={cardSoftStyle}
            onGoFinances={onGoFinances}
            btnNeutral={btnNeutral}
            bare
          />
        </ExpandablePanel>
      ) : null}

      {checkupResult?.recommendationTimeline?.length ? (
        <ExpandablePanel
          title="Action timeline"
          hint="Now, this month, and long-term — tap to expand"
          cardSoftStyle={cardSoftStyle}
        >
          <RecommendationTimeline
            timeline={checkupResult.recommendationTimeline}
            cardSoftStyle={cardSoftStyle}
            isMobile={isMobile}
            bare
          />
        </ExpandablePanel>
      ) : null}

      {checkupResult?.improvementRoadmap ? (
        <ExpandablePanel
          title="Improvement roadmap"
          hint="Security vs wealth tracks — tap to expand"
          cardSoftStyle={cardSoftStyle}
        >
          <ImprovementRoadmap
            roadmap={checkupResult.improvementRoadmap}
            compact
            cardSoftStyle={cardSoftStyle}
            onGoTab={onGoTab}
            btnNeutral={btnNeutral}
            bare
          />
        </ExpandablePanel>
      ) : null}

      {checkupResult?.scoreExplanation ? (
        <ExpandablePanel
          title="Score breakdown"
          hint="Security vs long-term wealth scores — tap to expand"
          cardSoftStyle={cardSoftStyle}
        >
          <ScoreExplainer
            explanation={checkupResult.scoreExplanation}
            isMobile={isMobile}
            cardSoftStyle={cardSoftStyle}
            compact={false}
            bare
            onGoTab={onGoTab}
            btnNeutral={btnNeutral}
          />
        </ExpandablePanel>
      ) : null}
    </div>
  );
}
