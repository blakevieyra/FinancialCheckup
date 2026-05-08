const { dbGet, dbAll } = require('./db');
const { gradeFromExpenseRatio, buildBudgetBullets } = require('./analysis');

async function snapshotForUserMonth(userId, month) {
  const incRow = await dbGet(
    'SELECT amount FROM income WHERE user_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
    [userId, month],
  );
  const income = Number(incRow?.amount ?? 0);
  const expRows = await dbAll(
    'SELECT category, amount, month FROM expenses WHERE user_id = ? AND month = ? ORDER BY category',
    [userId, month],
  );
  const totalExpenses = expRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = income - totalExpenses;
  const expenseRatio = income > 0 ? (totalExpenses / income) * 100 : 0;
  const grade = gradeFromExpenseRatio(expenseRatio);
  const bullets = buildBudgetBullets({ income, expenses: expRows });

  return {
    month,
    income,
    totalExpenses,
    balance,
    expenseRatio,
    grade,
    expenses: expRows.map((e) => ({ category: e.category, amount: Number(e.amount) || 0 })),
    deterministicTips: bullets,
  };
}

module.exports = { snapshotForUserMonth };
