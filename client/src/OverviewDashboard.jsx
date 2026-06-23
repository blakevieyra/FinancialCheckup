import ScoreHero from './ScoreHero';
import ImprovementRoadmap from './ImprovementRoadmap';
import ScoreExplainer from './ScoreExplainer';
import GuidePanel from './GuidePanel';
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
  profileSummary,
  userXp,
  rankData,
  rankBusy,
  rankErr,
}) {
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

  const insightPanels = [
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
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>Score & roadmap</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8', lineHeight: 1.45 }}>
              Improvement tracks and dimension scores. Priorities & projections are on Tools.
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
              <ExpandablePanel
                key={panel.key}
                title={panel.title}
                hint={panel.hint}
                accent={panel.accent}
                gridCard
                cardSoftStyle={cardSoftStyle}
              >
                {panel.body}
              </ExpandablePanel>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
