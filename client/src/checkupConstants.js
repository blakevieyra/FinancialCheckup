export const CHECKUP_PROCESS = [
  { step: '01', icon: '📋', title: 'Enter your financial snapshot', detail: 'No bank login. Income, expenses, debts, and savings — under 2 minutes.' },
  { step: '02', icon: '🔍', title: 'AI runs your full diagnostic', detail: '6 dimensions: budget, debt, savings, investments, insurance, and retirement.' },
  { step: '03', icon: '📊', title: 'Get your personalized score', detail: 'A single 0–100 score with breakdowns per category.' },
  { step: '04', icon: '🎯', title: 'Receive your action plan', detail: 'Prioritized steps for your situation — not generic advice.' },
  { step: '05', icon: '📈', title: 'Monitor progress over time', detail: 'Re-run monthly and watch your score climb.' },
];

export const CHECKUP_FEATURES = [
  { icon: '🏦', title: 'Budget gap analysis', detail: 'Pinpoints where money is slipping each month' },
  { icon: '📉', title: 'Debt payoff planner', detail: 'Avalanche vs snowball with timeline & interest saved' },
  { icon: '🛡️', title: 'Insurance gap scanner', detail: 'Life, disability, and liability gaps with cost estimates' },
  { icon: '📊', title: 'Investment health check', detail: 'Diversification score, fee drag, and allocation targets' },
  { icon: '🕐', title: 'Retirement trajectory', detail: 'On-track score with catch-up strategy if behind' },
  { icon: '📱', title: 'Monthly re-checkup', detail: 'Track your score as you implement the action plan' },
];

export const CHECKUP_STATS = [
  { value: '< 2 min', label: 'Full diagnostic' },
  { value: '6', label: 'Dimensions scored' },
  { value: 'Free', label: 'To get started' },
  { value: '100', label: 'Point scale' },
];

export const CHECKUP_FAQ = [
  {
    q: 'Do I need to connect my bank account?',
    a: 'No. Financial Checkup uses numbers you enter manually — no bank login or Plaid connection required.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Your data is stored securely on our server when you create an account. We do not sell your information.',
  },
  {
    q: 'How is the score calculated?',
    a: 'We score six dimensions (budget, debt, savings, investments, insurance, retirement) on a 0–100 scale, then average them for your overall score with letter grades per category.',
  },
  {
    q: 'How often should I run a checkup?',
    a: 'Monthly is ideal — re-enter updated balances and expenses to track improvement over time.',
  },
];

export const DEMO_LANDING_DIMENSIONS = [
  { key: 'budget', label: 'Budget', score: 82, blurb: 'Spending is well controlled relative to income. Small tweaks to discretionary categories could push you into the excellent range.' },
  { key: 'savings', label: 'Savings', score: 58, blurb: 'Emergency fund is building but below the 3-month target. Automate a weekly transfer to close the gap faster.' },
  { key: 'debt', label: 'Debt', score: 71, blurb: 'Debt load is manageable. Focus extra payments on highest-APR balances first (avalanche method).' },
  { key: 'investments', label: 'Investments', score: 45, blurb: 'Portfolio needs more diversification and international exposure. Review fee drag on active funds.' },
  { key: 'insurance', label: 'Insurance', score: 90, blurb: 'Strong coverage across life and liability. Disability gap is the main item to review.' },
  { key: 'retirement', label: 'Retirement', score: 62, blurb: 'On track for a modest retirement. Increasing 401k contributions by 2% would materially improve trajectory.' },
];

export const DEMO_ACTION_PLAN = [
  { priority: 'HIGH', title: 'Build emergency fund', detail: 'Target: $15,600 (3 months) · Current: $4,200 · Gap: $11,400', timeline: 'Save $380/mo → funded in 30 months' },
  { priority: 'MED', title: 'Rebalance investment portfolio', detail: 'Add 15% international equity exposure · Shift from bonds toward growth ETFs' },
  { priority: 'MED', title: 'Close disability insurance gap', detail: 'Estimated cost: $28/month · Replaces $3,900/mo if unable to work' },
];

export const DEFAULT_SNAPSHOT = {
  income: 6500,
  monthlyExpenses: 4800,
  expenses: [],
  emergencyFund: 4200,
  monthlySavings: 380,
  debts: [{ name: 'Credit card', balance: 8200, minPayment: 250, apr: 22 }],
  investmentTotal: 45000,
  stockPct: 55,
  bondPct: 30,
  internationalPct: 5,
  cashPct: 10,
  feePct: 0.85,
  hasLifeInsurance: true,
  hasDisabilityInsurance: false,
  hasLiabilityInsurance: false,
  age: 35,
  targetRetirementAge: 65,
  retirementBalance: 85000,
  monthlyRetirementContribution: 500,
  excludedFromScore: [],
};

/** Empty profile for registered users — no demo numbers. */
export const BLANK_SNAPSHOT = {
  income: 0,
  monthlyExpenses: 0,
  expenses: [],
  emergencyFund: 0,
  monthlySavings: 0,
  debts: [],
  investmentTotal: 0,
  stockPct: 0,
  bondPct: 0,
  internationalPct: 0,
  cashPct: 0,
  feePct: 0,
  hasLifeInsurance: false,
  hasDisabilityInsurance: false,
  hasLiabilityInsurance: false,
  age: 35,
  targetRetirementAge: 65,
  retirementBalance: 0,
  monthlyRetirementContribution: 0,
  excludedFromScore: [],
};

export const DIMENSION_LABELS = [
  { key: 'budget', label: 'Budget' },
  { key: 'debt', label: 'Debt' },
  { key: 'savings', label: 'Savings' },
  { key: 'investments', label: 'Investments' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'retirement', label: 'Retirement' },
];

export const DIMENSION_IMPORTANCE = {
  budget:
    'Your budget score shows whether spending stays within income. Controlling the gap between what you earn and what you spend is the foundation every other financial goal builds on.',
  savings:
    'Emergency savings protect you from job loss, medical bills, and surprise repairs without going into debt. A strong fund turns crises into inconveniences instead of financial setbacks.',
  debt:
    'Debt payments drain cash flow and compound against you. Understanding balances, interest rates, and payoff order helps you eliminate the costliest debts first and free money for saving and investing.',
  investments:
    'Investments grow wealth beyond what saving alone can do. Allocation, diversification, and fees determine whether your portfolio supports long-term goals or quietly erodes returns.',
  insurance:
    'Insurance transfers catastrophic risk you cannot afford to self-fund. Life, disability, and liability gaps can wipe out years of progress in a single event if left uncovered.',
  retirement:
    'Retirement planning ensures today\'s income eventually replaces itself when you stop working. Contribution rate, time horizon, and account growth determine whether you can maintain your lifestyle later.',
};
