import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ExpandablePanel from './ExpandablePanel';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
import { ActionPlanBlock } from './CheckupPanel';

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
  const gridLower = isMobile ? '1fr' : isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr';

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

      {checkupResult?.improvementRoadmap ? (
        <ImprovementRoadmap
          roadmap={checkupResult.improvementRoadmap}
          compact
          cardSoftStyle={cardSoftStyle}
          onGoTab={onGoTab}
          btnNeutral={btnNeutral}
        />
      ) : null}

      {checkupResult ? (
        <div style={{ display: 'grid', gridTemplateColumns: gridLower, gap: 16 }}>
          <ExpandablePanel title="Top priorities" hint="Tap to see ranked action items" cardSoftStyle={cardSoftStyle}>
            <ActionPlanBlock actionPlan={checkupResult.actionPlan} cardSoftStyle={cardSoftStyle} compact={false} bare />
          </ExpandablePanel>
          {checkupResult.scoreExplanation ? (
            <ExpandablePanel title="How your score works" hint="Tap for breakdown & formula" cardSoftStyle={cardSoftStyle}>
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
      ) : null}
    </div>
  );
}
