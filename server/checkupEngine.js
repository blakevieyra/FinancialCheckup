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
    excludedFromScore: normalizeExcludedFromScore(raw.excludedFromScore),
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

/** Weights reflect total financial health — cash flow and safety matter most. */
const DIMENSION_WEIGHTS = {
  budget: 0.25,
  savings: 0.2,
  debt: 0.18,
  retirement: 0.13,
  investments: 0.12,
  insurance: 0.12,
};

const SCORABLE_DIMENSION_KEYS = Object.keys(DIMENSION_WEIGHTS);

function normalizeExcludedFromScore(raw) {
  const list = Array.isArray(raw) ? raw.filter((k) => SCORABLE_DIMENSION_KEYS.includes(k)) : [];
  if (list.length >= SCORABLE_DIMENSION_KEYS.length) return [];
  return [...new Set(list)];
}

function getEffectiveWeights(excludedFromScore = []) {
  const excluded = new Set(normalizeExcludedFromScore(excludedFromScore));
  let rawSum = 0;
  const raw = {};
  for (const key of SCORABLE_DIMENSION_KEYS) {
    if (excluded.has(key)) continue;
    raw[key] = DIMENSION_WEIGHTS[key];
    rawSum += DIMENSION_WEIGHTS[key];
  }
  if (rawSum <= 0) {
    return { weights: { ...DIMENSION_WEIGHTS }, included: [...SCORABLE_DIMENSION_KEYS] };
  }
  const weights = {};
  for (const [key, w] of Object.entries(raw)) {
    weights[key] = w / rawSum;
  }
  return { weights, included: Object.keys(weights) };
}

/** Short-term security vs long-term wealth building. */
const HORIZON_MAP = {
  budget: 'security',
  savings: 'security',
  debt: 'security',
  insurance: 'security',
  retirement: 'wealth',
  investments: 'wealth',
};

const HORIZON_WEIGHTS = {
  security: { budget: 0.35, savings: 0.3, debt: 0.2, insurance: 0.15 },
  wealth: { retirement: 0.55, investments: 0.45 },
};

const TAB_FOR_DIMENSION = {
  budget: 'money',
  savings: 'profile',
  debt: 'profile',
  insurance: 'profile',
  retirement: 'profile',
  investments: 'profile',
};

function computeOverallScore(dimensions, excludedFromScore = []) {
  const { weights } = getEffectiveWeights(excludedFromScore);
  let weighted = 0;
  for (const d of dimensions) {
    const w = weights[d.key];
    if (w == null) continue;
    weighted += d.score * w;
  }
  return Number(weighted.toFixed(1));
}

function computeHorizonScore(dimensions, horizon, excludedFromScore = []) {
  const excluded = new Set(normalizeExcludedFromScore(excludedFromScore));
  const weights = HORIZON_WEIGHTS[horizon] || {};
  let weighted = 0;
  let wSum = 0;
  for (const d of dimensions) {
    if (HORIZON_MAP[d.key] !== horizon || excluded.has(d.key)) continue;
    const w = weights[d.key];
    if (!w) continue;
    weighted += d.score * w;
    wSum += w;
  }
  return wSum > 0 ? Number((weighted / wSum).toFixed(1)) : null;
}

function estimateScoreLift(dimKey, currentScore, excludedFromScore = [], target = 75) {
  if (normalizeExcludedFromScore(excludedFromScore).includes(dimKey)) return 0;
  const { weights } = getEffectiveWeights(excludedFromScore);
  const w = weights[dimKey] ?? 0;
  return Number((Math.max(0, target - currentScore) * w).toFixed(1));
}

function buildScoreFormulaText(excludedFromScore = []) {
  const { weights, included } = getEffectiveWeights(excludedFromScore);
  const parts = included.map((k) => {
    const label = k.charAt(0).toUpperCase() + k.slice(1);
    return `${label} ${Math.round(weights[k] * 100)}%`;
  });
  const excluded = normalizeExcludedFromScore(excludedFromScore);
  const excludedNote = excluded.length
    ? ` Excluded from total: ${excluded.join(', ')}.`
    : '';
  return `Total uses ${parts.join(' · ')}.${excludedNote}`;
}

function concreteActionsForDimension(key, dim, snap) {
  switch (key) {
    case 'budget': {
      const over = snap.income > 0 && snap.monthlyExpenses > snap.income ? snap.monthlyExpenses - snap.income : 0;
      if (snap.income <= 0) {
        return ['Open Money tab → enter your monthly take-home income → Save Income.'];
      }
      if (over > 0) {
        return [
          `Money tab → find categories totaling $${Math.ceil(over).toLocaleString()}/mo to reduce.`,
          'Lower dining, subscriptions, or discretionary lines first — save expenses.',
          'Overview → Update score once spending is at or below income.',
        ];
      }
      return [
        'Money tab → keep total expenses under 80% of income each month.',
        'Review Progress charts monthly for category drift.',
        'Update score after any income or spending change.',
      ];
    }
    case 'savings': {
      const target = dim.targetEmergencyFund || snap.monthlyExpenses * 3;
      const monthly = snap.monthlySavings > 0 ? snap.monthlySavings : Math.max(50, Math.round(snap.income * 0.05));
      const months = monthly > 0 ? Math.ceil((dim.gap || target) / monthly) : null;
      return [
        `Profile → Emergency fund: enter current balance ($${snap.emergencyFund.toLocaleString()}).`,
        `Profile → Monthly savings: set $${monthly.toLocaleString()}/mo auto-transfer on payday.`,
        months
          ? `Save $${monthly.toLocaleString()}/mo → $${target.toLocaleString()} fund in ~${months} months.`
          : `Build to $${target.toLocaleString()} (3 months of expenses).`,
        'Update score after each month you add to the fund.',
      ];
    }
    case 'debt':
      return [
        'Profile → Debts: add each loan/card with balance, APR, and minimum payment.',
        'Pick avalanche (highest APR first) or snowball (smallest balance first).',
        'Send any monthly surplus (after bills) as extra payment — track in Profile.',
        'Update score when balances drop.',
      ];
    case 'insurance':
      return [
        'Profile → check Life insurance if dependents rely on your income.',
        'Profile → check Disability insurance (~60–65% income replacement).',
        'Profile → check Umbrella liability if you have assets or a home.',
        'Update score after each policy is in place.',
      ];
    case 'retirement': {
      const bump = Math.max(25, Math.round((dim.catchUpMonthly || 0) / 4));
      return [
        `Profile → Retirement balance: log 401(k)/IRA total ($${snap.retirementBalance.toLocaleString()}).`,
        `Profile → Monthly contribution: add $${bump.toLocaleString()}/mo this month.`,
        dim.catchUpMonthly > 0
          ? `Ramp toward +$${dim.catchUpMonthly.toLocaleString()}/mo over 2–3 months.`
          : 'Aim for 10–15% of income toward retirement.',
        'Update score quarterly as balance grows.',
      ];
    }
    case 'investments':
      return snap.investmentTotal > 0
        ? [
            'Profile → verify stock/bond/international/cash allocation matches your age.',
            'Target broad diversification and fees under 0.5%/yr.',
            'Rebalance once per year or after large market moves.',
            'Update score after rebalancing.',
          ]
        : [
            'Open or log an IRA, Roth IRA, or taxable brokerage in Profile.',
            'Start with low-cost index funds — even $50–100/mo builds the score.',
            'Enter portfolio total and allocation percentages in Profile.',
            'Update score once balance is recorded.',
          ];
    default:
      return [suggestImprovement(key, dim, snap)];
  }
}

function explainDimension(key, dim, snap) {
  switch (key) {
    case 'budget':
      if (snap.income <= 0) return 'No income entered — we cannot measure whether spending is sustainable.';
      if (snap.monthlyExpenses > snap.income) {
        return `You spend $${(snap.monthlyExpenses - snap.income).toLocaleString()} more than you earn each month.`;
      }
      return dim.summary || 'Spending is within income.';
    case 'debt':
      return dim.totalBalance > 0
        ? `Reported debt balances affect payoff timeline and cash-flow stress.`
        : 'No debt balances on file — loan/credit card spending in Money does not count until you add balances in Profile.';
    case 'savings':
      return `${dim.emergencyMonths ?? 0} months of expenses saved · target 3–6 months ($${(dim.targetEmergencyFund || 0).toLocaleString()}).`;
    case 'investments':
      return snap.investmentTotal > 0 ? dim.summary : 'Starting or reporting an investment balance unlocks diversification scoring.';
    case 'insurance':
      return dim.score >= 99 ? 'Core coverage types reported.' : 'Missing coverage leaves income and assets exposed to shocks.';
    case 'retirement':
      return dim.onTrack ? dim.summary : `Behind age benchmark of $${(dim.benchmarkBalance || 0).toLocaleString()}.`;
    default:
      return dim.summary || '';
  }
}

function suggestImprovement(key, dim, snap) {
  switch (key) {
    case 'budget': {
      if (snap.income <= 0) return 'Enter income on the Money tab.';
      const over = snap.monthlyExpenses - snap.income;
      if (over > 0) return `Cut or reallocate $${Math.ceil(over).toLocaleString()}/mo to break even, then Update score.`;
      return 'Keep expense ratio under 80% of income.';
    }
    case 'debt':
      return dim.totalBalance > 0 ? 'Add extra payments in Profile debts or use the debt planner.' : 'Add real balances for loans/cards in Profile if you carry debt.';
    case 'savings':
      return snap.monthlySavings > 0
        ? `Auto-save $${snap.monthlySavings.toLocaleString()}/mo until emergency fund hits $${(dim.targetEmergencyFund || 0).toLocaleString()}.`
        : `Set a monthly savings amount and build $${(dim.targetEmergencyFund || snap.monthlyExpenses * 3).toLocaleString()} (3 mo expenses).`;
    case 'investments':
      return snap.investmentTotal > 0 ? 'Rebalance toward age-appropriate equity and lower fees.' : 'Open an IRA or increase employer plan contributions.';
    case 'insurance':
      return 'Check life, disability, and umbrella boxes in Profile as you obtain coverage.';
    case 'retirement':
      return dim.catchUpMonthly > 0
        ? `Increase retirement contributions by $${dim.catchUpMonthly.toLocaleString()}/mo.`
        : 'Log retirement balance and monthly contributions in Profile.';
    default:
      return `Improve ${dim.label.toLowerCase()} score above 75.`;
  }
}

function buildImprovementRoadmap(dimensions, snap) {
  const excluded = snap.excludedFromScore || [];
  const securityScore = computeHorizonScore(dimensions, 'security', excluded);
  const wealthScore = computeHorizonScore(dimensions, 'wealth', excluded);
  const tracks = { security: [], wealth: [] };
  let globalStep = 1;

  const addStep = (horizon, dim) => {
    if (!dim || dim.score >= 80) return;
    if (excluded.includes(dim.key)) return;
    const actions = concreteActionsForDimension(dim.key, dim, snap);
    tracks[horizon].push({
      step: globalStep,
      horizon,
      dimension: dim.key,
      dimensionLabel: dim.label,
      title: dim.key === 'budget' && snap.monthlyExpenses > snap.income
        ? 'Stop spending more than you earn'
        : dim.key === 'savings'
          ? 'Build your emergency safety net'
          : dim.key === 'insurance'
            ? 'Cover income and asset risks'
            : dim.key === 'debt'
              ? 'Reduce debt stress'
              : dim.key === 'retirement'
                ? 'Catch up on retirement savings'
                : dim.key === 'investments'
                  ? 'Grow long-term invested wealth'
                  : `Strengthen ${dim.label.toLowerCase()}`,
      why: explainDimension(dim.key, dim, snap),
      actions,
      goToTab: TAB_FOR_DIMENSION[dim.key] || 'profile',
      potentialLift: estimateScoreLift(dim.key, dim.score, excluded),
      currentScore: dim.score,
      targetScore: 75,
      timeframe:
        dim.key === 'budget' ? 'now'
          : dim.key === 'savings' || dim.key === 'insurance' ? '30d'
            : dim.key === 'debt' ? '90d'
              : '6mo',
    });
    globalStep += 1;
  };

  const byScore = (a, b) => a.score - b.score;
  const securityOrder = ['budget', 'savings', 'insurance', 'debt'];
  for (const key of securityOrder) {
    addStep('security', dimensions.find((d) => d.key === key));
  }
  dimensions.filter((d) => HORIZON_MAP[d.key] === 'security' && !securityOrder.includes(d.key)).sort(byScore).forEach((d) => addStep('security', d));

  const wealthOrder = ['retirement', 'investments'];
  for (const key of wealthOrder) {
    addStep('wealth', dimensions.find((d) => d.key === key));
  }

  tracks.security.push({
    step: globalStep,
    horizon: 'security',
    dimension: 'recap',
    dimensionLabel: 'Refresh',
    title: 'Re-check your security score',
    why: 'Short-term security improves when cash flow, savings, insurance, and debt are all updated.',
    actions: [
      'After any Money or Profile change → Overview → Update score.',
      'Repeat monthly until Security score is 75+.',
    ],
    goToTab: 'overview',
    potentialLift: 0,
    currentScore: securityScore,
    targetScore: 75,
    timeframe: 'now',
    isRecap: true,
  });
  globalStep += 1;

  tracks.wealth.push({
    step: globalStep,
    horizon: 'wealth',
    dimension: 'recap',
    dimensionLabel: 'Refresh',
    title: 'Re-check your long-term health score',
    why: 'Wealth score rises as retirement contributions and investments grow over quarters and years.',
    actions: [
      'Update retirement balance and contributions in Profile each quarter.',
      'Overview → Update score to track progress on the Progress tab.',
    ],
    goToTab: 'overview',
    potentialLift: 0,
    currentScore: wealthScore,
    targetScore: 75,
    timeframe: '6mo',
    isRecap: true,
  });

  const totalPotentialLift = [...tracks.security, ...tracks.wealth]
    .filter((s) => !s.isRecap)
    .reduce((sum, s) => sum + (s.potentialLift || 0), 0);
  const currentOverallScore = computeOverallScore(dimensions, excluded);

  return {
    securityScore: securityScore ?? 0,
    wealthScore: wealthScore ?? 0,
    securityScoreNA: securityScore == null,
    wealthScoreNA: wealthScore == null,
    currentOverallScore,
    securityLabel: 'Short-term security',
    wealthLabel: 'Long-term health',
    securityIntro:
      'Protect yourself this month and the next 90 days: live within your means, build a cash buffer, insure risks, and control debt.',
    wealthIntro:
      'Build wealth over years: fund retirement consistently and grow investments aligned with your age and goals.',
    tracks,
    totalSteps: globalStep,
    totalPotentialLift: Number(Math.min(100, totalPotentialLift).toFixed(1)),
    projectedScore: Number(Math.min(100, currentOverallScore + totalPotentialLift).toFixed(1)),
    excludedFromScore: excluded,
    alwaysDo: 'Save changes on Money or Profile → tap Update score on Overview → watch Progress history.',
  };
}

function buildScoreExplanation(dimensions, overallScore, snap) {
  const excluded = snap.excludedFromScore || [];
  const { weights: effectiveWeights, included } = getEffectiveWeights(excluded);
  const securityScore = computeHorizonScore(dimensions, 'security', excluded);
  const wealthScore = computeHorizonScore(dimensions, 'wealth', excluded);
  return {
    summary:
      excluded.length
        ? `Your overall score uses ${included.length} of 6 categories (you excluded ${excluded.length}). Excluded areas still show their individual scores but do not affect the total.`
        : 'Your Financial Checkup Score blends short-term security (cash flow, emergency fund, insurance, debt) and long-term health (retirement, investments). Fix security first — it unlocks room to invest.',
    formula: buildScoreFormulaText(excluded),
    excludedFromScore: excluded,
    includedDimensions: included,
    securityScore: securityScore ?? 0,
    wealthScore: wealthScore ?? 0,
    securityScoreNA: securityScore == null,
    wealthScoreNA: wealthScore == null,
    securitySummary:
      securityScore >= 75
        ? 'Short-term security is solid — maintain your buffer and coverage.'
        : securityScore >= 50
          ? 'Security needs work — prioritize budget balance and emergency savings before investing more.'
          : 'Security is at risk — stop overspending and build a cash buffer before long-term goals.',
    wealthSummary:
      wealthScore >= 75
        ? 'Long-term trajectory looks healthy — stay consistent with contributions.'
        : wealthScore >= 50
          ? 'Wealth building is underway — increase retirement contributions steadily.'
          : 'Long-term health is behind — start retirement contributions even if small.',
    dimensions: dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      score: d.score,
      grade: d.grade,
      horizon: HORIZON_MAP[d.key] || 'security',
      includedInOverall: !excluded.includes(d.key),
      weightPct: Math.round((effectiveWeights[d.key] ?? 0) * 100),
      contribution: excluded.includes(d.key)
        ? 0
        : Number((d.score * (effectiveWeights[d.key] ?? 0)).toFixed(1)),
      summary: d.summary,
      why: explainDimension(d.key, d, snap),
      improveBy: suggestImprovement(d.key, d, snap),
      actions: concreteActionsForDimension(d.key, d, snap),
      potentialLift: estimateScoreLift(d.key, d.score, excluded),
      goToTab: TAB_FOR_DIMENSION[d.key] || 'profile',
    })),
    overallScore,
    overallGrade: gradeFromScore(overallScore),
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
      horizon: 'security',
      timeframe: mo && mo <= 3 ? '90d' : mo && mo <= 6 ? '6mo' : '30d',
      title: 'Build emergency fund',
      detail: `Target: $${savings.targetEmergencyFund.toLocaleString()} (3 months) · Current: $${snap.emergencyFund.toLocaleString()} · Gap: $${savings.gap.toLocaleString()}`,
      timeline: snap.monthlySavings > 0 ? `Save $${snap.monthlySavings.toLocaleString()}/mo → funded in ${mo} months` : 'Set a monthly savings amount to close the gap.',
      steps: snap.monthlySavings > 0
        ? [
            `Transfer $${snap.monthlySavings.toLocaleString()} to a dedicated savings account on payday.`,
            `Track balance until you reach $${savings.targetEmergencyFund.toLocaleString()}.`,
            'Re-run checkup monthly to watch your savings score rise.',
          ]
        : [
            `Pick a fixed amount (start with $${Math.max(50, Math.round(snap.income * 0.05)).toLocaleString()}/mo if unsure).`,
            `Enter it as Monthly savings in Profile.`,
            `Build toward $${savings.targetEmergencyFund.toLocaleString()} (3 months of expenses).`,
          ],
    });
  }

  const invest = dimensions.find((d) => d.key === 'investments');
  if (invest && invest.score < 75 && snap.investmentTotal > 0) {
    items.push({
      priority: 'MED',
      horizon: 'wealth',
      timeframe: '90d',
      title: 'Rebalance investment portfolio',
      detail: `Add ${Math.max(0, 15 - snap.internationalPct).toFixed(0)}% international equity exposure · Target equity ~${invest.allocation?.targetEquityPct ?? 70}% for your age`,
      steps: [
        'Review current stock/bond/international/cash split in Profile.',
        `Shift toward ~${invest.allocation?.targetEquityPct ?? 70}% equity for your age.`,
        'Confirm fund fees are under 0.5%/yr where possible.',
      ],
    });
  }

  const ins = dimensions.find((d) => d.key === 'insurance');
  if (ins?.gaps?.length) {
    const dis = ins.gaps.find((g) => g.type === 'disability');
    if (dis) {
      items.push({
        priority: 'MED',
        horizon: 'security',
        timeframe: '30d',
        title: 'Close disability insurance gap',
        detail: `Estimated cost: $${dis.estMonthlyCost}/month · Replaces $${dis.replacesMonthly?.toLocaleString()}/mo if unable to work`,
        steps: [
          'Get quotes from employer benefits or an independent broker.',
          `Budget ~$${dis.estMonthlyCost}/mo for long-term disability coverage.`,
          'Check the box in Profile once active and Update score.',
        ],
      });
    }
  }

  const debt = dimensions.find((d) => d.key === 'debt');
  if (debt && debt.totalBalance > 0 && debt.score < 70) {
    items.push({
      priority: debt.score < 50 ? 'HIGH' : 'MED',
      horizon: 'security',
      timeframe: '6mo',
      title: 'Accelerate debt payoff',
      detail: `$${debt.totalBalance.toLocaleString()} outstanding · Compare avalanche vs snowball in the debt planner`,
      steps: [
        'List each debt with balance, APR, and minimum payment in Profile.',
        'Choose avalanche (highest APR first) or snowball (smallest balance first).',
        'Apply any monthly surplus after essentials toward extra payments.',
      ],
    });
  }

  const ret = dimensions.find((d) => d.key === 'retirement');
  if (ret && !ret.onTrack) {
    items.push({
      priority: ret.score < 55 ? 'HIGH' : 'MED',
      horizon: 'wealth',
      timeframe: ret.catchUpMonthly > 200 ? '6mo' : '90d',
      title: 'Boost retirement contributions',
      detail: `Catch-up: +$${ret.catchUpMonthly.toLocaleString()}/mo to reach age benchmark of $${ret.benchmarkBalance.toLocaleString()}`,
      steps: [
        `Increase 401(k)/IRA by $${Math.max(25, Math.round(ret.catchUpMonthly / 4)).toLocaleString()}/mo this month.`,
        `Work up to +$${ret.catchUpMonthly.toLocaleString()}/mo over the next 2–3 months.`,
        'Update retirement balance in Profile each quarter.',
      ],
    });
  }

  const budget = dimensions.find((d) => d.key === 'budget');
  if (budget && budget.score < 65 && budget.gaps?.length) {
    const over = snap.income > 0 && snap.monthlyExpenses > snap.income ? snap.monthlyExpenses - snap.income : 0;
    items.push({
      priority: budget.score < 50 ? 'HIGH' : 'MED',
      horizon: 'security',
      timeframe: 'now',
      title: 'Fix budget gaps',
      detail: budget.gaps[0],
      steps: over > 0
        ? [
            `On Money tab, identify categories totaling at least $${Math.ceil(over).toLocaleString()}/mo to trim.`,
            'Cut dining, subscriptions, or discretionary lines first.',
            'Save expenses, then Update score to refresh your budget dimension.',
          ]
        : [
            'Review top spending categories on the Progress tab charts.',
            budget.gaps[0],
            'Update score after changes.',
          ],
    });
  }

  for (const dim of sorted) {
    if (items.length >= 6) break;
    if (items.some((i) => i.title.toLowerCase().includes(dim.key))) continue;
    if (dim.score >= 80) continue;
    items.push({
      priority: dim.score < 55 ? 'HIGH' : 'MED',
      horizon: HORIZON_MAP[dim.key] || 'security',
      timeframe: '90d',
      title: `Improve ${dim.label.toLowerCase()}`,
      detail: dim.summary,
      steps: concreteActionsForDimension(dim.key, dim, snap),
    });
  }

  return items.slice(0, 6);
}

const TIMEFRAME_LABELS = {
  now: 'This month',
  '30d': 'Next 30 days',
  '90d': 'Next 90 days',
  '6mo': '6+ months',
};

function buildRecommendationTimeline(actionPlan) {
  const order = ['now', '30d', '90d', '6mo'];
  const phases = order.map((tf) => ({
    timeframe: tf,
    label: TIMEFRAME_LABELS[tf],
    items: (actionPlan || []).filter((i) => (i.timeframe || '90d') === tf),
  }));
  return phases.filter((p) => p.items.length > 0);
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

  const excluded = snap.excludedFromScore || [];
  const overallScore = computeOverallScore(dimensions, excluded);
  const overallGrade = gradeFromScore(overallScore);
  const scoreExplanation = buildScoreExplanation(dimensions, overallScore, snap);
  const actionPlan = buildActionPlan(dimensions, snap);
  const recommendationTimeline = buildRecommendationTimeline(actionPlan);
  const improvementRoadmap = buildImprovementRoadmap(dimensions, snap);
  const weakCount = dimensions.filter((d) => !excluded.includes(d.key) && d.score < 75).length;
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
    excludedFromScore: excluded,
    includedDimensions: getEffectiveWeights(excluded).included,
    expenseRatioGrade: gradeFromExpenseRatio(snap.income > 0 ? (snap.monthlyExpenses / snap.income) * 100 : null),
    dimensions,
    scoreExplanation,
    improvementRoadmap,
    actionPlan,
    recommendationTimeline,
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
  'excludedFromScore',
];

function extractExtendedProfile(raw = {}) {
  const out = {};
  for (const key of EXTENDED_PROFILE_KEYS) {
    if (key === 'excludedFromScore') {
      if (raw[key] !== undefined && raw[key] !== null) {
        out[key] = normalizeExcludedFromScore(raw[key]);
      }
      continue;
    }
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
  DIMENSION_WEIGHTS,
  SCORABLE_DIMENSION_KEYS,
  computeOverallScore,
  normalizeExcludedFromScore,
  getEffectiveWeights,
};
