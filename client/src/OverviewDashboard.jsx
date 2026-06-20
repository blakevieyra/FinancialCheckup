import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
import PrioritiesPanel from './PrioritiesPanel';
import RecommendationTimeline from './RecommendationTimeline';
import ExpandablePanel from './ExpandablePanel';
import BadgeRewardsPanel from './BadgeRewardsPanel';

function StatTile({ label, value, cardSoftStyle, valueColor }) {
  return (
    <div style={{ ...cardSoftStyle, padding: '1rem 1.1rem', minHeight: 72 }}>
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, marginTop: 6, lineHeight: 1.2, color: valueColor }}>{value}</div>
    </div>
  );
}

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
  savingsRate,
  trajectory,
  topCategory,
  userXp,
}) {
  const gridOverview = isMobile
    ? '1fr'
    : isDesktop
      ? 'minmax(0, 1.15fr) minmax(300px, 420px)'
      : '1fr 1fr';

  const scoreColumn = (
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
  );

  const sideColumn = (
    <div style={{ display: 'grid', gap: 12, minWidth: 0, alignContent: 'start' }}>
      <LedgerSnapshot income={income} totalExpenses={totalExpenses} cardSoftStyle={cardSoftStyle} />

      <GuidePanel
        checkupResult={checkupResult}
        primaryGoal={primaryGoal}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        onNavigate={onGuideNavigate}
      />

      {userXp != null ? (
        <BadgeRewardsPanel userXp={userXp} cardSoftStyle={cardSoftStyle} />
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: 10 }}>
        <StatTile label="Savings rate" value={`${savingsRate.toFixed(1)}%`} cardSoftStyle={cardSoftStyle} />
        {!isMobile ? (
          <StatTile label="Top category" value={topCategory || 'N/A'} cardSoftStyle={cardSoftStyle} />
        ) : null}
      </div>
      {isMobile ? (
        <StatTile label="Top category" value={topCategory || 'N/A'} cardSoftStyle={cardSoftStyle} />
      ) : null}
      {trajectory ? (
        <StatTile label="Trajectory" value={trajectory} cardSoftStyle={cardSoftStyle} />
      ) : null}

      <div style={{ display: 'grid', gap: 8 }}>
        <button type="button" onClick={onGoFinances} style={{ ...btnNeutral, width: '100%', textAlign: 'left' }}>
          Edit finances & profile →
        </button>
        <button type="button" onClick={onGoProgress} style={{ ...btnNeutral, width: '100%', textAlign: 'left' }}>
          History & charts →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: isDesktop ? 24 : 18, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridOverview, gap: isDesktop ? 20 : 16, alignItems: 'start' }}>
        {isMobile ? (
          <>
            {scoreColumn}
            {sideColumn}
          </>
        ) : (
          <>
            <div style={{ minWidth: 0 }}>{scoreColumn}</div>
            {sideColumn}
          </>
        )}
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
