const { gradeFromExpenseRatio } = require('./analysis');

/** Expense ratio as % of income, or null if income not usable */
function expenseRatioPercent(income, totalExpenses) {
  const inc = Number(income) || 0;
  if (inc <= 0) return null;
  return ((Number(totalExpenses) || 0) / inc) * 100;
}

/** 0–100, higher is better (surplus-focused). Same basis as leaderboard. */
function healthScore(income, totalExpenses) {
  const ratio = expenseRatioPercent(income, totalExpenses);
  if (ratio == null) {
    return { eligible: false, score: 0, expenseRatio: null, grade: 'N/A', balance: -Math.abs(Number(totalExpenses) || 0) };
  }
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const balance = inc - exp;
  const raw = 100 - ratio;
  const score = Math.max(0, Math.min(100, raw));
  return {
    eligible: true,
    score,
    expenseRatio: ratio,
    grade: gradeFromExpenseRatio(ratio),
    balance,
  };
}

module.exports = { expenseRatioPercent, healthScore, gradeFromExpenseRatio };
