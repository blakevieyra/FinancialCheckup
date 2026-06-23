import { EXPENSE_CATEGORY_GROUPS, EXPENSE_CATEGORIES } from './categoryOptions';

export function sumExpenses(expenses) {
  return (expenses || []).reduce((total, row) => total + (Number(row.amount) || 0), 0);
}

export function buildExpenseRowsForEditor(saved, groups = EXPENSE_CATEGORY_GROUPS) {
  const presetSet = new Set(groups.flatMap((g) => g.items));
  const amountByCategory = new Map();
  const orphans = [];

  for (const row of saved || []) {
    const cat = row.category;
    const amt = row.amount === '' || row.amount == null ? '' : row.amount;
    if (presetSet.has(cat)) {
      amountByCategory.set(cat, amt);
    } else if (Number(amt) > 0) {
      orphans.push({ category: cat, amount: amt });
    }
  }

  const grouped = groups.map((group) => ({
    label: group.label,
    items: group.items.map((category) => ({
      category,
      amount: amountByCategory.has(category) ? amountByCategory.get(category) : '',
    })),
  }));

  return { grouped, orphans };
}

export function categoryExpenseSummary(amount, totalExpenses, income) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return 'Not entered this month';

  const parts = [`$${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`];
  if (totalExpenses > 0) {
    parts.push(`${((amt / totalExpenses) * 100).toFixed(0)}% of spending`);
  }
  if (income > 0) {
    parts.push(`${((amt / income) * 100).toFixed(0)}% of income`);
  }
  return parts.join(' · ');
}

export function serializeExpensesForSave(expenses) {
  return (expenses || [])
    .map((row) => ({
      category: String(row.category || '').trim(),
      amount: Math.max(0, Number(row.amount) || 0),
    }))
    .filter((row) => row.category && row.amount > 0);
}

export { EXPENSE_CATEGORIES };
