const { dbAll, dbGet } = require('./db');
const { buildBudgetBullets, gradeFromExpenseRatio } = require('./analysis');

function computeTotalExp(expensesRows) {
  return expensesRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

async function digestForUserMonth(userId, month) {
  const usernameRow = await dbGet('SELECT username FROM users WHERE id = ?', [userId]);
  const username = usernameRow?.username ?? 'Subscriber';

  const incRow = await dbGet(
    'SELECT amount FROM income WHERE user_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
    [userId, month],
  );
  const income = Number(incRow?.amount ?? 0);
  const expRows = await dbAll(
    'SELECT category, amount FROM expenses WHERE user_id = ? AND month = ? ORDER BY amount DESC',
    [userId, month],
  );
  const totalExp = computeTotalExp(expRows);
  const expenseRatio = income > 0 ? (totalExp / income) * 100 : 0;
  const balance = income - totalExp;

  const bullets = buildBudgetBullets({ income, expenses: expRows });
  const top = [...expRows]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 4)
    .filter((x) => Number(x.amount) > 0);

  const subject = `FinancialCheckup — weekly check-in (${month})`;
  const txt = [
    `Hi ${username},`,
    '',
    `This is your recurring FinancialCheckup for ${month}.`,
    `(Your ledger is tracked by month — this email is a reminder + snapshot of your current month's numbers.)`,
    '',
    `Income: ${income.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
    `Expenses: ${totalExp.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
    `Leftover / deficit: ${balance.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
    `Expense ratio: ${expenseRatio.toFixed(1)}%`,
    `Grade: ${gradeFromExpenseRatio(expenseRatio)}`,
    '',
    top.length ? `Top expense lines:\n${top.map((e) => `- ${e.category}: ${Number(e.amount).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`).join('\n')}` : 'No expense lines with amounts yet — open the app and update totals.',
    '',
    'Highlights:',
    ...bullets.map((b) => `- ${b}`),
    '',
    'Open FinancialCheckup to adjust categories, save totals, or request AI insights.',
    '',
    '— FinancialCheckup',
  ].join('\n');

  return {
    username,
    month,
    subject,
    plain: txt,
  };
}

module.exports = { digestForUserMonth };
