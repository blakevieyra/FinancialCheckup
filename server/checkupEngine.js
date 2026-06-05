const { gradeFromExpenseRatio } = require('./analysis');

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function gradeFromScore(score) {
  if (!Number.isFinite(score)) return 'N/A';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSnapshot(raw = {}) {
  const income = num(raw.income);
  const expenses = Array.isArray(raw.expenses)
    ? raw.expenses.map((e) => ({ category: String(e.category || 'Other'), amount: num(e.amount) }))
    : [];
  const expenseTotalFromRows = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyExpenses = num(raw.monthlyExpenses, expenseTotalFromRows);

  return {
    income,
    monthlyExpenses,
    expenses,
    debts: (raw.debts || []).map((d) => ({
      name: String(d.name || 'Debt'),
      balance: num(d.balance),
      minPayment: num(d.minPayment),
      apr: num(d.apr),
    })).filter((d) => d.balance > 0),
    emergencyFund: num(raw.emergencyFund),
    monthlySavings: num(raw.monthlySavings),
    investmentTotal: num(raw.investmentTotal),
    stockPct: num(raw.stockPct),
    bondPct: num(raw.bondPct),
    internationalPct: num(raw.internationalPct),
    cashPct: num(raw.cashPct),
    feePct: num(raw.feePct),
    hasLifeInsurance: Boolean(raw.hasLifeInsurance),
    hasDisabilityInsurance: Boolean(raw.hasDisabilityInsurance),
    hasLiabilityInsurance: Boolean(raw.hasLiabilityInsurance),
    age: num(raw.age, 35),
    targetRetirementAge: num(raw.targetRetirementAge, 65),
    retirementBalance: num(raw.retirementBalance),
    monthlyRetirementContribution: num(raw.monthlyRetirementContribution),
  };
}

function scoreBudget(snap) {
  const { income, monthlyExpenses, expenses } = snap;
  const ratio = income > 0 ? (monthlyExpenses / income) * 100 : null;
  const score = ratio == null ? 0 : clamp(100 - ratio, 0, 100);
  const gaps = [];
  if (income <= 0) gaps.push('Add income to benchmark spending.');
  if (monthlyExpenses <= 0) gaps.push('Add monthly expenses to find budget gaps.');
  if (ratio != null && ratio > 50) gaps.push(`Expense ratio ${ratio.toFixed(1)}% — trim discretionary categories.`);
  if (income > 0 && monthlyExpenses > income) {
    gaps.push(`Spending exceeds income by $${(monthlyExpenses - income).toLocaleString(undefined, { maximumFractionDigits: 0 })} per month.`);
  }
  const total = monthlyExpenses || expenses.reduce((s, e) => s + e.amount, 0);
  expenses
    .filter((e) => e.amount > 0 && total > 0 && e.amount / total > 0.25)
    .slice(0, 3)
    .forEach((e) => {
      gaps.push(`${e.category} is ${Math.round((e.amount / total) * 100)}% of spending — review for savings.`);
    });

  return {
    key: 'budget',
    label: 'Budget',
    score: Number(score.toFixed(1)),
    grade: gradeFromScore(score),
    summary: ratio == null ? 'Income needed for budget score.' : `Expense ratio ${ratio.toFixed(1)}%.`,
    gaps,
  };
}

function scoreDebt(snap) {
  const { income, debts } = snap;
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const minPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const dti = income > 0 ? (minPayments / income) * 100 : null;
  const debtToIncome = income > 0 ? (totalBalance / (income * 12)) * 100 : null;

  let score = 100;
  if (totalBalance <= 0) score = 95;
  else {
    if (dti != null) score -= clamp(dti * 1.4, 0, 45);
    if (debtToIncome != null) score -= clamp(debtToIncome * 0.35, 0, 35);
  }
  score = clamp(score, 0, 100);

  return {
    key: 'debt',
    label: 'Debt',
    score: Number(score.toFixed(1)),
    grade: gradeFromScore(score),
    summary: totalBalance <= 0 ? 'No reported debt balances.' : `$${totalBalance.toLocaleString()} total · DTI ${dti != null ? `${dti.toFixed(1)}%` : 'N/A'}`,
    totalBalance,
    minPayments,
  };
}

function scoreSavings(snap) {
  const { monthlyExpenses, emergencyFund, monthlySavings, income } = snap;
  const months = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  let score = 20;
  if (months >= 6) score = 100;
  else if (months >= 3) score = 78;
  else if (months >= 1) score = 52;
  else if (emergencyFund > 0) score = 35;

  const savingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;
  if (savingsRate >= 20) score = clamp(score + 12, 0, 100);
  else if (savingsRate >= 10) score = clamp(score + 6, 0, 100);

  const target = monthlyExpenses * 3;
  const gap = Math.max(0, target - emergencyFund);

  return {
    key: 'savings',
    label: 'Savings',
    score: Number(clamp(score, 0, 100).toFixed(1)),
    grade: gradeFromScore(score),
    summary: `${months.toFixed(1)} months of expenses in emergency fund.`,
    emergencyMonths: Number(months.toFixed(1)),
    targetEmergencyFund: Number(target.toFixed(0)),
    gap,
  };
}

function scoreInvestments(snap) {
  const { investmentTotal, stockPct, bondPct, internationalPct, cashPct, feePct, age } = snap;
  if (investmentTotal <= 0) {
    return {
      key: 'investments',
      label: 'Investments',
      score: 40,
      grade: 'F',
      summary: 'No investment balance reported — start with employer plan or IRA.',
      diversificationScore: 0,
    };
  }

  let score = 70;
  const intlGap = Math.max(0, 15 - internationalPct);
  score -= intlGap * 1.2;
  if (feePct > 1) score -= (feePct - 1) * 8;
  if (feePct > 0.5 && feePct <= 1) score -= 4;

  const equity = stockPct + internationalPct;
  const targetEquity = clamp(110 - age, 40, 90);
  const equityGap = Math.abs(equity - targetEquity);
  score -= equityGap * 0.35;

  if (cashPct > 15) score -= (cashPct - 15) * 0.5;
  score = clamp(score, 0, 100);

  return {
    key: 'investments',
    label: 'Investments',
    score: Number(score.toFixed(1)),
    grade: gradeFromScore(score),
    summary: `Diversification ${Math.round(score)}/100 · fees ${feePct.toFixed(2)}%/yr.`,
    diversificationScore: Number(score.toFixed(1)),
    allocation: { stockPct, bondPct, internationalPct, cashPct, targetEquityPct: targetEquity },
  };
}

function scoreInsurance(snap) {
  const { income, hasLifeInsurance, hasDisabilityInsurance, hasLiabilityInsurance } = snap;
  let score = 0;
  const gaps = [];
  if (hasLifeInsurance) score += 34;
  else gaps.push({ type: 'life', label: 'Life insurance gap', estMonthlyCost: Math.round(income * 0.002) });
  if (hasDisabilityInsurance) score += 33;
  else {
    gaps.push({
      type: 'disability',
      label: 'Disability insurance gap',
      estMonthlyCost: Math.round(income * 0.005),
      replacesMonthly: Math.round(income * 0.65),
    });
  }
  if (hasLiabilityInsurance) score += 33;
  else gaps.push({ type: 'liability', label: 'Umbrella liability gap', estMonthlyCost: 18 });

  return {
    key: 'insurance',
    label: 'Insurance',
    score: Number(score.toFixed(1)),
    grade: gradeFromScore(score),
    summary: gaps.length ? `${gaps.length} coverage gap(s) flagged.` : 'Core coverage types reported.',
    gaps,
  };
}

function scoreRetirement(snap) {
  const { age, targetRetirementAge, retirementBalance, monthlyRetirementContribution, income } = snap;
  const yearsToRetire = Math.max(1, targetRetirementAge - age);
  const benchmark = (income * 12 * age) / 10;
  const ratio = benchmark > 0 ? retirementBalance / benchmark : 0;
  let score = clamp(ratio * 100, 0, 100);
  const contribRate = income > 0 ? (monthlyRetirementContribution / income) * 100 : 0;
  if (contribRate >= 15) score = clamp(score + 8, 0, 100);
  else if (contribRate >= 10) score = clamp(score + 4, 0, 100);

  const onTrack = score >= 75;
  const catchUpMonthly = onTrack ? 0 : Math.max(0, Math.round((benchmark - retirementBalance) / (yearsToRetire * 12)));

  return {
    key: 'retirement',
    label: 'Retirement',
    score: Number(score.toFixed(1)),
    grade: gradeFromScore(score),
    summary: onTrack ? 'On track vs age benchmark.' : `Behind benchmark — consider +$${catchUpMonthly.toLocaleString()}/mo.`,
    onTrack,
    catchUpMonthly,
    benchmarkBalance: Number(benchmark.toFixed(0)),
  };
}

function simulateDebtPayoff(debts, extraMonthly, strategy) {
  const rows = debts
    .map((d) => ({ ...d, balance: num(d.balance), apr: num(d.apr), minPayment: num(d.minPayment) }))
    .filter((d) => d.balance > 0);
  if (!rows.length) {
    return { months: 0, totalInterest: 0, order: [] };
  }

  const sorted =
    strategy === 'snowball'
      ? [...rows].sort((a, b) => a.balance - b.balance)
      : [...rows].sort((a, b) => b.apr - a.apr);

  let months = 0;
  let totalInterest = 0;
  const working = sorted.map((d) => ({ ...d }));
  const maxMonths = 600;

  while (working.some((d) => d.balance > 0.01) && months < maxMonths) {
    months += 1;
    let extra = extraMonthly;
    working.forEach((d) => {
      const interest = (d.balance * (d.apr / 100)) / 12;
      totalInterest += interest;
      d.balance += interest;
      const pay = Math.min(d.balance, d.minPayment);
      d.balance -= pay;
    });
    const target = working.find((d) => d.balance > 0.01);
    if (target && extra > 0) {
      const pay = Math.min(target.balance, extra);
      target.balance -= pay;
      extra -= pay;
    }
  }

  return {
    months,
    totalInterest: Number(totalInterest.toFixed(0)),
    order: sorted.map((d) => d.name),
  };
}

function buildActionPlan(dimensions, snap) {
  const items = [];
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);

  const savings = dimensions.find((d) => d.key === 'savings');
  if (savings && savings.gap > 0) {
    const mo = snap.monthlySavings > 0 ? Math.ceil(savings.gap / snap.monthlySavings) : null;
    items.push({
      priority: savings.score < 55 ? 'HIGH' : 'MED',
      title: 'Build emergency fund',
      detail: `Target: $${savings.targetEmergencyFund.toLocaleString()} (3 months) · Current: $${snap.emergencyFund.toLocaleString()} · Gap: $${savings.gap.toLocaleString()}`,
      timeline: snap.monthlySavings > 0 ? `Save $${snap.monthlySavings.toLocaleString()}/mo → funded in ${mo} months` : 'Set a monthly savings amount to close the gap.',
    });
  }

  const invest = dimensions.find((d) => d.key === 'investments');
  if (invest && invest.score < 75 && snap.investmentTotal > 0) {
    items.push({
      priority: 'MED',
      title: 'Rebalance investment portfolio',
      detail: `Add ${Math.max(0, 15 - snap.internationalPct).toFixed(0)}% international equity exposure · Target equity ~${invest.allocation?.targetEquityPct ?? 70}% for your age`,
    });
  }

  const ins = dimensions.find((d) => d.key === 'insurance');
  if (ins?.gaps?.length) {
    const dis = ins.gaps.find((g) => g.type === 'disability');
    if (dis) {
      items.push({
        priority: 'MED',
        title: 'Close disability insurance gap',
        detail: `Estimated cost: $${dis.estMonthlyCost}/month · Replaces $${dis.replacesMonthly?.toLocaleString()}/mo if unable to work`,
      });
    }
  }

  const debt = dimensions.find((d) => d.key === 'debt');
  if (debt && debt.totalBalance > 0 && debt.score < 70) {
    items.push({
      priority: debt.score < 50 ? 'HIGH' : 'MED',
      title: 'Accelerate debt payoff',
      detail: `$${debt.totalBalance.toLocaleString()} outstanding · Compare avalanche vs snowball in the debt planner`,
    });
  }

  const ret = dimensions.find((d) => d.key === 'retirement');
  if (ret && !ret.onTrack) {
    items.push({
      priority: ret.score < 55 ? 'HIGH' : 'MED',
      title: 'Boost retirement contributions',
      detail: `Catch-up: +$${ret.catchUpMonthly.toLocaleString()}/mo to reach age benchmark of $${ret.benchmarkBalance.toLocaleString()}`,
    });
  }

  const budget = dimensions.find((d) => d.key === 'budget');
  if (budget && budget.score < 65 && budget.gaps?.length) {
    items.push({
      priority: budget.score < 50 ? 'HIGH' : 'MED',
      title: 'Fix budget gaps',
      detail: budget.gaps[0],
    });
  }

  for (const dim of sorted) {
    if (items.length >= 6) break;
    if (items.some((i) => i.title.toLowerCase().includes(dim.key))) continue;
    if (dim.score >= 80) continue;
    items.push({
      priority: dim.score < 55 ? 'HIGH' : 'MED',
      title: `Improve ${dim.label.toLowerCase()}`,
      detail: dim.summary,
    });
  }

  return items.slice(0, 6);
}

function runCheckup(rawSnapshot) {
  const snap = normalizeSnapshot(rawSnapshot);
  const dimensions = [
    scoreBudget(snap),
    scoreDebt(snap),
    scoreSavings(snap),
    scoreInvestments(snap),
    scoreInsurance(snap),
    scoreRetirement(snap),
  ];

  const overallScore = Number(
    (dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length).toFixed(1),
  );
  const overallGrade = gradeFromScore(overallScore);
  const weakCount = dimensions.filter((d) => d.score < 75).length;
  const headline =
    overallScore >= 85
      ? 'Excellent — minor tweaks only'
      : overallScore >= 70
        ? `Good — ${weakCount} area${weakCount === 1 ? '' : 's'} to improve`
        : overallScore >= 55
          ? `Fair — ${weakCount} priorities to address`
          : `Needs attention — start with top action items`;

  const extraPayment = Math.max(0, snap.income - snap.monthlyExpenses) * 0.5;
  const debtPlanner = {
    extraMonthly: Number(extraPayment.toFixed(0)),
    avalanche: simulateDebtPayoff(snap.debts, extraPayment, 'avalanche'),
    snowball: simulateDebtPayoff(snap.debts, extraPayment, 'snowball'),
  };

  return {
    overallScore,
    overallGrade,
    headline,
    expenseRatioGrade: gradeFromExpenseRatio(snap.income > 0 ? (snap.monthlyExpenses / snap.income) * 100 : null),
    dimensions,
    actionPlan: buildActionPlan(dimensions, snap),
    budgetGapAnalysis: dimensions.find((d) => d.key === 'budget')?.gaps || [],
    debtPlanner,
    insuranceGaps: dimensions.find((d) => d.key === 'insurance')?.gaps || [],
    investmentHealth: dimensions.find((d) => d.key === 'investments'),
    retirementTrajectory: dimensions.find((d) => d.key === 'retirement'),
    snapshot: snap,
  };
}

function prefillFromLedger(ledger) {
  const debtPayments = (ledger.expenses || [])
    .filter((e) => /debt/i.test(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const savingsCat = (ledger.expenses || []).find((e) => /savings/i.test(e.category));
  return {
    income: ledger.income,
    monthlyExpenses: ledger.totalExpenses,
    expenses: ledger.expenses,
    monthlySavings: savingsCat ? savingsCat.amount : Math.max(0, ledger.balance * 0.2),
    debts: debtPayments > 0 ? [{ name: 'Debt payments (from ledger)', balance: debtPayments * 12, minPayment: debtPayments, apr: 18 }] : [],
  };
}

/** Fields stored in checkup_profiles — budget numbers always come from the ledger when authed. */
const EXTENDED_PROFILE_KEYS = [
  'debts',
  'emergencyFund',
  'monthlySavings',
  'investmentTotal',
  'stockPct',
  'bondPct',
  'internationalPct',
  'cashPct',
  'feePct',
  'hasLifeInsurance',
  'hasDisabilityInsurance',
  'hasLiabilityInsurance',
  'age',
  'targetRetirementAge',
  'retirementBalance',
  'monthlyRetirementContribution',
];

function extractExtendedProfile(raw = {}) {
  const out = {};
  for (const key of EXTENDED_PROFILE_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) out[key] = raw[key];
  }
  return out;
}

function mergeSnapshotWithLedger(ledger, extended = {}) {
  const fromLedger = prefillFromLedger(ledger);
  return normalizeSnapshot({
    ...fromLedger,
    ...extractExtendedProfile(extended),
    income: ledger.income,
    monthlyExpenses: ledger.totalExpenses,
    expenses: ledger.expenses,
  });
}

module.exports = {
  runCheckup,
  normalizeSnapshot,
  prefillFromLedger,
  extractExtendedProfile,
  mergeSnapshotWithLedger,
  gradeFromScore,
};
