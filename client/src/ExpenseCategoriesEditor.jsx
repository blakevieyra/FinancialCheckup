import { useMemo } from 'react';
import { EXPENSE_CATEGORY_GROUPS } from './categoryOptions';
import {
  buildExpenseRowsForEditor,
  categoryExpenseSummary,
  sumExpenses,
} from './expenseCategories';
import {
  CollapsibleGroup,
  FieldSummary,
  formatMoney,
  SectionHeader,
  TotalBar,
} from './panelPrimitives';

function CategoryRow({ category, amount, totalExpenses, income, onChange, inputStyle, disabled }) {
  const hasAmount = Number(amount) > 0;

  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{category}</span>
      <input
        type="number"
        value={amount}
        step="0.01"
        min="0"
        onChange={(e) => onChange(category, e.target.value)}
        placeholder="0.00"
        disabled={disabled}
        style={{ ...inputStyle, width: '100%', padding: 8 }}
        aria-label={`${category} amount`}
      />
      <FieldSummary hasValue={hasAmount}>
        {categoryExpenseSummary(amount, totalExpenses, income)}
      </FieldSummary>
    </label>
  );
}

export default function ExpenseCategoriesEditor({
  expenses,
  onExpenseChange,
  income = 0,
  inputStyle,
  isMobile,
  isTablet,
  disabled,
  embedded = false,
}) {
  const grid = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';
  const totalExpenses = sumExpenses(expenses);
  const inc = Number(income) || 0;

  const { grouped, orphans } = useMemo(
    () => buildExpenseRowsForEditor(expenses, EXPENSE_CATEGORY_GROUPS),
    [expenses],
  );

  const amountByCategory = useMemo(() => {
    const map = new Map();
    for (const row of expenses || []) map.set(row.category, row.amount);
    return map;
  }, [expenses]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {!embedded ? (
        <SectionHeader
          title="Monthly expenses by category"
          subtitle="Enter what you spent in each category — totals and share of income update automatically."
        />
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        {grouped.map((group) => {
          const items = group.items.map((row) => ({
            ...row,
            amount: amountByCategory.has(row.category) ? amountByCategory.get(row.category) : row.amount,
          }));
          const groupTotal = items.reduce((n, row) => n + (Number(row.amount) || 0), 0);
          const defaultOpen = items.some((row) => Number(row.amount) > 0);

          return (
            <CollapsibleGroup
              key={group.label}
              label={group.label}
              meta={groupTotal > 0 ? `${formatMoney(groupTotal)} this month` : 'No amounts entered'}
              defaultOpen={defaultOpen}
            >
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12 }}>
                {items.map((row) => (
                  <CategoryRow
                    key={row.category}
                    category={row.category}
                    amount={row.amount}
                    totalExpenses={totalExpenses}
                    income={inc}
                    onChange={onExpenseChange}
                    inputStyle={inputStyle}
                    disabled={disabled}
                  />
                ))}
              </div>
            </CollapsibleGroup>
          );
        })}

        {orphans.length ? (
          <CollapsibleGroup label="Other saved categories" meta={`${formatMoney(sumExpenses(orphans))} this month`} defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12 }}>
              {orphans.map((row) => (
                <CategoryRow
                  key={row.category}
                  category={row.category}
                  amount={row.amount}
                  totalExpenses={totalExpenses}
                  income={inc}
                  onChange={onExpenseChange}
                  inputStyle={inputStyle}
                  disabled={disabled}
                />
              ))}
            </div>
          </CollapsibleGroup>
        ) : null}
      </div>

      <TotalBar label="Monthly expenses total" value={formatMoney(totalExpenses, { decimals: 2 })} variant="expense" />
    </div>
  );
}
