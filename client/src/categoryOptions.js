/** Shared picklists for expenses, debts, investments, and retirement accounts. */

export const CUSTOM_OPTION_VALUE = '__custom__';

/** Legacy labels from older builds — map to blank so users re-pick from the list. */
export const LEGACY_DEBT_LABELS = new Set(['Other loan', 'Other']);

export const EXPENSE_CATEGORY_GROUPS = [
  {
    label: 'Housing & utilities',
    items: ['Housing / rent', 'Mortgage', 'Utilities', 'Electric', 'Gas (home)', 'Water / sewer', 'Internet', 'Phone / mobile', 'Home maintenance'],
  },
  {
    label: 'Food & dining',
    items: ['Groceries', 'Dining out', 'Coffee / snacks'],
  },
  {
    label: 'Transportation',
    items: ['Transportation', 'Gas / fuel', 'Car payment', 'Car insurance', 'Public transit', 'Rideshare'],
  },
  {
    label: 'Health & family',
    items: ['Health / medical', 'Health insurance', 'Prescriptions', 'Dental / vision', 'Childcare', 'Education / tuition'],
  },
  {
    label: 'Lifestyle',
    items: ['Entertainment', 'Streaming services', 'Shopping', 'Clothing', 'Personal care', 'Gym / fitness', 'Travel / vacation', 'Gifts / donations', 'Subscriptions', 'Pet care'],
  },
  {
    label: 'Financial',
    items: ['Debt payments', 'Savings transfer', 'Taxes', 'Insurance (other)', 'Business expenses', 'General'],
  },
];

export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_GROUPS.flatMap((g) => g.items);

export const DEBT_TYPES = [
  { label: 'Mortgage', defaultApr: 6.5 },
  { label: 'Home equity loan / HELOC', defaultApr: 8.5 },
  { label: 'Credit card', defaultApr: 22 },
  { label: 'Store credit card', defaultApr: 26 },
  { label: 'Auto loan', defaultApr: 7 },
  { label: 'Personal loan', defaultApr: 12 },
  { label: 'Student loan (federal)', defaultApr: 5.5 },
  { label: 'Student loan (private)', defaultApr: 8 },
  { label: 'Medical debt', defaultApr: 0 },
  { label: 'Business loan', defaultApr: 9 },
  { label: 'Payday / short-term loan', defaultApr: 36 },
  { label: 'Buy now, pay later', defaultApr: 0 },
  { label: '401(k) / retirement loan', defaultApr: 5 },
  { label: 'Family / personal loan', defaultApr: 0 },
];

export const INVESTMENT_ACCOUNT_TYPES = [
  'Employer 401(k)',
  'Roth 401(k)',
  'Traditional IRA',
  'Roth IRA',
  'SEP IRA',
  'SIMPLE IRA',
  'HSA (invested)',
  'Taxable brokerage',
  'Index funds / ETFs',
  'Mutual funds',
  'Individual stocks',
  'Bonds / fixed income',
  '529 college savings',
  'Custodial / UTMA',
  'Real estate (investment)',
  'Crypto / digital assets',
  'Employee stock (ESPP/RSU)',
  'Cash / money market',
];

export const RETIREMENT_ACCOUNT_TYPES = [
  'Employer 401(k)',
  'Roth 401(k)',
  '403(b)',
  '457(b)',
  'Traditional IRA',
  'Roth IRA',
  'SEP IRA',
  'SIMPLE IRA',
  'Pension / defined benefit',
  'Annuity',
  'Taxable brokerage (retirement)',
  'HSA (future medical)',
  'Inherited IRA',
];

export const DEBT_STARTER_TEMPLATES = DEBT_TYPES.slice(0, 4).map(({ label, defaultApr }) => ({
  name: label,
  balance: 0,
  minPayment: 0,
  apr: defaultApr,
}));

export const INVESTMENT_STARTER_ACCOUNTS = [
  { type: 'Employer 401(k)', balance: 0 },
  { type: 'Taxable brokerage', balance: 0 },
];

export const RETIREMENT_STARTER_ACCOUNTS = [
  { type: 'Employer 401(k)', balance: 0, monthlyContribution: 0 },
  { type: 'Traditional IRA', balance: 0, monthlyContribution: 0 },
];

export function isPresetOption(value, options) {
  if (!value) return false;
  if (typeof options[0] === 'string') return options.includes(value);
  return options.some((o) => o.label === value);
}

export function optionsWithCustom(flatOptions) {
  return [...flatOptions, CUSTOM_OPTION_VALUE];
}

export function debtOptionsWithCustom() {
  return [...DEBT_TYPES.map((d) => d.label), CUSTOM_OPTION_VALUE];
}
