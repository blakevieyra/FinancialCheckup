import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
import PrioritiesPanel from './PrioritiesPanel';
import RecommendationTimeline from './RecommendationTimeline';

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
  userLevel,
  xpLabel,
}) {
  const gridOverview = isMobile ? '1fr' : isDesktop ? 'minmax(0, 1fr) minmax(280px, 340px)' : '1fr';

  return (
    <div style={{ display: 'grid', gap: isDesktop ? 24 : 18, width: '100%' }}>
      <GuidePanel
        checkupResult={checkupResult}
        primaryGoal={primaryGoal}
        cardSoftStyle={cardSoftStyle}
        btnNeutral={btnNeutral}
        onNavigate={onGuideNavigate}
      />

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
        </div>

        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          {userLevel ? (
            <div style={{ ...cardSoftStyle, padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase' }}>Your level</div>
              <div style={{ fontWeight: 800, fontSize: 22, marginTop: 4 }}>Level {userLevel}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{xpLabel}</div>
            </div>
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
        <PrioritiesPanel
          actionPlan={checkupResult.actionPlan}
          cardSoftStyle={cardSoftStyle}
          onGoFinances={onGoFinances}
          btnNeutral={btnNeutral}
        />
      ) : null}

      {checkupResult?.recommendationTimeline?.length ? (
        <div style={{ ...cardSoftStyle, padding: '1rem 1.15rem' }}>
          <RecommendationTimeline
            timeline={checkupResult.recommendationTimeline}
            cardSoftStyle={cardSoftStyle}
            isMobile={isMobile}
          />
        </div>
      ) : null}

      {checkupResult?.improvementRoadmap ? (
        <ImprovementRoadmap
          roadmap={checkupResult.improvementRoadmap}
          compact
          cardSoftStyle={cardSoftStyle}
          onGoTab={onGoTab}
          btnNeutral={btnNeutral}
        />
      ) : null}

      {checkupResult?.scoreExplanation ? (
        <div style={{ ...cardSoftStyle, padding: '1rem 1.15rem' }}>
          <ScoreExplainer
            explanation={checkupResult.scoreExplanation}
            isMobile={isMobile}
            cardSoftStyle={cardSoftStyle}
            compact={false}
            bare
            onGoTab={onGoTab}
            btnNeutral={btnNeutral}
          />
        </div>
      ) : null}
    </div>
  );
}
