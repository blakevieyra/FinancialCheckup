export const INCOME_SOURCE_PRESETS = [
  'Salary / wages',
  'Freelance',
  'Business income',
  'Rental income',
  'Investments / dividends',
  'Benefits',
  'Side gig',
  'Other',
];

export function newIncomeSourceId() {
  return `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newIncomeSource(label = 'Salary / wages', amount = '') {
  return { id: newIncomeSourceId(), label, amount };
}

export function sumIncomeSources(sources) {
  return (sources || []).reduce((total, row) => total + (Number(row.amount) || 0), 0);
}

/** Normalize API / legacy single-amount data into editable source rows. */
export function ensureIncomeSources(sources, fallbackAmount) {
  if (Array.isArray(sources) && sources.length) {
    return sources.map((row, i) => ({
      id: row.id || `src-${i}`,
      label: String(row.label || 'Income').trim() || 'Income',
      amount: row.amount === '' || row.amount == null ? '' : row.amount,
    }));
  }
  const amt = Number(fallbackAmount);
  if (amt > 0) return [newIncomeSource('Income', amt)];
  return [newIncomeSource('Salary / wages', '')];
}

export function serializeIncomeSources(sources) {
  return (sources || [])
    .map((row) => ({
      id: row.id || newIncomeSourceId(),
      label: String(row.label || '').trim() || 'Income',
      amount: Math.max(0, Number(row.amount) || 0),
    }))
    .filter((row) => row.label);
}

export function buildIncomePayload(month, sources) {
  const serialized = serializeIncomeSources(sources);
  const amount = sumIncomeSources(serialized);
  return { month, amount, sources: serialized };
}
