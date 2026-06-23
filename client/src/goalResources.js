/** Goal-directed strategy copy & resources for savings, portfolio, and retirement cards. */

export const GOAL_OPTIONS = [
  { id: 'emergency_fund', label: 'Build emergency fund', desc: 'Focus on savings & cash reserves' },
  { id: 'debt_free', label: 'Pay off debt', desc: 'Avalanche/snowball payoff plan' },
  { id: 'wealth_building', label: 'Wealth building', desc: 'Grow net worth across savings, investments & retirement' },
  { id: 'retirement', label: 'Retire on track', desc: '401k/IRA contributions & trajectory' },
  { id: 'invest', label: 'Grow investments', desc: 'Portfolio allocation & diversification' },
  { id: 'insurance', label: 'Fix insurance gaps', desc: 'Life, disability & liability coverage' },
];

const GOAL_NAMES = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.id, g.label]));

const AREA_STRATEGIES = {
  savings: {
    emergency_fund: {
      focus: 'Your primary goal is a cash safety net — fund 3–6 months of essential expenses before aggressive investing.',
      steps: [
        'Set a monthly transfer to savings right after payday.',
        'Target one month of expenses first, then scale to 3–6 months.',
        'Keep the fund in a high-yield savings account, not invested.',
      ],
      resources: [
        { title: 'CFPB — Emergency savings', url: 'https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/emergency-savings/' },
        { title: 'FDIC — Savings basics', url: 'https://www.fdic.gov/resources/consumers/savings/index.html' },
      ],
    },
    debt_free: {
      focus: 'While paying debt, keep a starter emergency fund ($500–$1,000) so new expenses do not add more debt.',
      steps: [
        'Automate minimum debt payments first.',
        'Save a small buffer, then redirect extra cash to highest-rate debt.',
        'Rebuild full emergency fund after high-interest debt is gone.',
      ],
      resources: [
        { title: 'CFPB — Paying down debt', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-the-best-way-to-pay-off-debt-en-954/' },
      ],
    },
    wealth_building: {
      focus: 'Wealth building starts with consistent savings rate — automate surplus before discretionary spending.',
      steps: [
        'Aim for 15–20% of income to savings + investments combined.',
        'Split between emergency fund, retirement accounts, and taxable investing.',
        'Increase savings rate 1% each quarter until you hit target.',
      ],
      resources: [
        { title: 'Investor.gov — Saving & investing', url: 'https://www.investor.gov/introduction-investing/getting-started/saving-and-investing-roadmap' },
      ],
    },
    retirement: {
      focus: 'Strong savings habits fund retirement — automate contributions and avoid lifestyle creep as income rises.',
      steps: [
        'Capture employer 401(k) match before extra taxable savings.',
        'Build 1–3 months liquid savings alongside retirement contributions.',
        'Increase retirement deferrals 1% per year until you hit 15%+.',
      ],
      resources: [
        { title: 'SSA — Retirement planning', url: 'https://www.ssa.gov/benefits/retirement/planner/' },
      ],
    },
    default: {
      focus: 'Build a consistent monthly savings habit — even small amounts compound when automated.',
      steps: [
        'Pay yourself first with an automatic transfer.',
        'Track progress toward 3–6 months of essential expenses.',
        'Review savings rate quarterly and adjust after raises.',
      ],
      resources: [
        { title: 'MyMoney.gov — Save & invest', url: 'https://www.mymoney.gov/saveandinvest' },
      ],
    },
  },
  investments: {
    invest: {
      focus: 'Your goal is portfolio growth — prioritize low-cost diversification aligned with your time horizon.',
      steps: [
        'Use broad index funds for core stock/bond exposure.',
        'Rebalance once or twice per year — do not chase hot sectors.',
        'Keep fees under 0.20% on core holdings where possible.',
      ],
      resources: [
        { title: 'Investor.gov — Asset allocation', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/asset-allocation' },
        { title: 'SEC — Index funds', url: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-funds-etfs' },
      ],
    },
    wealth_building: {
      focus: 'Wealth building favors diversified growth assets with steady contributions over market timing.',
      steps: [
        'Max tax-advantaged accounts first, then taxable brokerage.',
        'Maintain 3–6 month cash reserve before increasing risk.',
        'Increase contribution rate with every income bump.',
      ],
      resources: [
        { title: 'Investor.gov — Compound interest', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
      ],
    },
    retirement: {
      focus: 'Retirement investing should tilt toward long-term growth early, gradually adding bonds as you near your target age.',
      steps: [
        'Use target-date or age-based stock/bond mix as a baseline.',
        'Increase 401(k)/IRA contributions before taxable trading.',
        'Avoid withdrawals — let compounding work across decades.',
      ],
      resources: [
        { title: 'IRS — Retirement topics', url: 'https://www.irs.gov/retirement-plans' },
      ],
    },
    default: {
      focus: 'Start with diversified, low-cost funds and invest consistently regardless of short-term market moves.',
      steps: [
        'Define stock/bond mix based on years until you need the money.',
        'Automate monthly investments.',
        'Review allocation annually, not daily.',
      ],
      resources: [
        { title: 'Investor.gov — Getting started', url: 'https://www.investor.gov/introduction-investing/getting-started' },
      ],
    },
  },
  retirement: {
    retirement: {
      focus: 'Your goal is retiring on track — maximize tax-deferred savings and verify you are closing the monthly gap to benchmark.',
      steps: [
        'Increase 401(k)/IRA deferrals to at least 15% of income (including match).',
        'Project income needs at 70–80% of pre-retirement spending.',
        'Review Social Security estimates and adjust target retirement age if needed.',
      ],
      resources: [
        { title: 'SSA — Retirement estimator', url: 'https://www.ssa.gov/benefits/retirement/planner/estimator.html' },
        { title: 'DOL — Retirement savings', url: 'https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/publications/top-10-ways-to-prepare-for-retirement' },
      ],
    },
    wealth_building: {
      focus: 'Retirement accounts are the tax-efficient core of long-term wealth — fund them aggressively while you are earning.',
      steps: [
        'Capture full employer match, then max IRA/HSA if eligible.',
        'Use Roth vs traditional based on current vs expected future tax bracket.',
        'Avoid early withdrawals — penalties erase years of compounding.',
      ],
      resources: [
        { title: 'IRS — IRA contribution limits', url: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits' },
      ],
    },
    invest: {
      focus: 'Balance growth investing today with retirement funding — retirement accounts should not be neglected for taxable trading.',
      steps: [
        'Fund retirement accounts before speculative positions.',
        'Keep growth stocks in tax-advantaged accounts when possible.',
        'Set a target retirement contribution % and automate it.',
      ],
      resources: [
        { title: 'Investor.gov — Retirement', url: 'https://www.investor.gov/introduction-investing/investing-basics/saving-retirement' },
      ],
    },
    default: {
      focus: 'Consistent retirement contributions matter more than perfect timing — automate and increase 1% per year.',
      steps: [
        'Know your target retirement age and monthly savings gap.',
        'Use employer plans first; add IRA if needed.',
        'Revisit projection after major life or income changes.',
      ],
      resources: [
        { title: 'SSA — Plan for retirement', url: 'https://www.ssa.gov/benefits/retirement/planner/' },
      ],
    },
  },
};

export function goalLabel(primaryGoal) {
  return GOAL_NAMES[primaryGoal] || 'General financial wellness';
}

export function goalDescription(primaryGoal) {
  return GOAL_OPTIONS.find((g) => g.id === primaryGoal)?.desc || 'Holistic score across all six dimensions.';
}

export function strategyForArea(area, primaryGoal) {
  const areaMap = AREA_STRATEGIES[area];
  if (!areaMap) return null;
  return areaMap[primaryGoal] || areaMap.default;
}
