import SpecialistInsightPanel from './SpecialistInsightPanel';

/** Six dimension AI report cards — budget, debt, insurance, investments, savings, retirement. */
export default function SpecialistReportsGrid({
  result,
  isTablet,
  cardSoftStyle,
  token,
  month,
  profile,
  primaryGoal,
  isPro,
  onGoPlan,
  btnPrimary,
  btnNeutral,
  income,
  totalExpenses,
  extended,
}) {
  if (!result) return null;
  const budgetDim = result.dimensions?.find((d) => d.key === 'budget');
  const debtDim = result.dimensions?.find((d) => d.key === 'debt');
  const savingsDim = result.dimensions?.find((d) => d.key === 'savings');
  const investDim = result.dimensions?.find((d) => d.key === 'investments');
  const insDim = result.dimensions?.find((d) => d.key === 'insurance');
  const retireDim = result.dimensions?.find((d) => d.key === 'retirement');

  const debtSummary = result.debtPlanner
    ? `Extra $${result.debtPlanner.extraMonthly?.toLocaleString()}/mo · Avalanche ${result.debtPlanner.avalanche?.months ?? 0} mo vs Snowball ${result.debtPlanner.snowball?.months ?? 0} mo`
    : debtDim?.summary;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
      <SpecialistInsightPanel
        area="budget"
        summary={budgetDim?.summary || (result.budgetGapAnalysis || [])[0]}
        gaps={(result.budgetGapAnalysis || []).slice(0, 5)}
        dimensionScore={budgetDim?.score}
        dimensionGrade={budgetDim?.grade}
        snapshot={{ income, totalExpenses, ...extended }}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="debt"
        summary={debtSummary}
        gaps={[
          result.debtPlanner?.avalanche ? `Avalanche: ${result.debtPlanner.avalanche.months} mo, $${result.debtPlanner.avalanche.totalInterest?.toLocaleString()} interest` : null,
          result.debtPlanner?.snowball ? `Snowball: ${result.debtPlanner.snowball.months} mo, $${result.debtPlanner.snowball.totalInterest?.toLocaleString()} interest` : null,
        ].filter(Boolean)}
        dimensionScore={debtDim?.score}
        dimensionGrade={debtDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="insurance"
        summary={insDim?.summary}
        gaps={result.insuranceGaps}
        dimensionScore={insDim?.score}
        dimensionGrade={insDim?.grade}
        snapshot={{ ...extended, hasLifeInsurance: extended?.hasLifeInsurance, hasDisabilityInsurance: extended?.hasDisabilityInsurance }}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="investments"
        summary={result.investmentHealth?.summary || investDim?.summary}
        gaps={result.investmentHealth?.gaps || []}
        dimensionScore={investDim?.score}
        dimensionGrade={investDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="savings"
        summary={savingsDim?.summary}
        gaps={savingsDim?.gap ? [{ label: `Emergency fund gap: $${Number(savingsDim.gap).toLocaleString()}` }] : []}
        dimensionScore={savingsDim?.score}
        dimensionGrade={savingsDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="retirement"
        summary={result.retirementTrajectory?.summary || retireDim?.summary}
        gaps={result.retirementTrajectory?.monthlyGap ? [`Suggested +$${Number(result.retirementTrajectory.monthlyGap).toLocaleString()}/mo to benchmark`] : []}
        dimensionScore={retireDim?.score}
        dimensionGrade={retireDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
    </div>
  );
}
