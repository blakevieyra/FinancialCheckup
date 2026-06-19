const { dbAll, dbGet } = require('./db');
const { buildBudgetBullets, gradeFromExpenseRatio } = require('./analysis');

function computeTotalExp(expensesRows) {
  return expensesRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

function parseCheckupResult(row) {
  if (!row?.result_json) return null;
  try {
    return typeof row.result_json === 'string' ? JSON.parse(row.result_json) : row.result_json;
  } catch {
    return null;
  }
}

async function digestForUserMonth(userId, month, frequency = 'weekly') {
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

  const checkupRow = await dbGet(
    `SELECT overall_score, result_json FROM checkup_history
     WHERE user_id = ? AND month = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, month],
  );
  const checkup = parseCheckupResult(checkupRow);
  const overallScore = checkup?.overallScore ?? checkupRow?.overall_score ?? null;
  const headline = checkup?.headline || '';
  const dimensions = (checkup?.dimensions || []).filter((d) => !(checkup?.excludedFromScore || []).includes(d.key));
  const topAction = checkup?.actionPlan?.[0];

  const bullets = buildBudgetBullets({ income, expenses: expRows });
  const top = [...expRows]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 4)
    .filter((x) => Number(x.amount) > 0);

  const freqLabel = frequency === 'daily' ? 'Daily' : frequency === 'monthly' ? 'Monthly' : 'Weekly';
  const subject = overallScore != null
    ? `FinancialCheckup — ${freqLabel} score summary (${Math.round(overallScore)}/100)`
    : `FinancialCheckup — ${freqLabel} check-in (${month})`;

  const money = (n) => Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const txt = [
    `Hi ${username},`,
    '',
    `Your ${freqLabel.toLowerCase()} Financial Checkup summary for ${month}.`,
    '',
    overallScore != null ? `─── YOUR SCORE ───` : `─── LEDGER SNAPSHOT ───`,
    overallScore != null ? `Overall score: ${Math.round(overallScore)}/100` : null,
    headline ? `Status: ${headline}` : null,
    '',
    `Income: ${money(income)}`,
    `Expenses: ${money(totalExp)}`,
    `Surplus / deficit: ${money(balance)}`,
    `Expense ratio: ${expenseRatio.toFixed(1)}% · Budget grade: ${gradeFromExpenseRatio(expenseRatio)}`,
    '',
    dimensions.length ? 'Category scores:' : null,
    ...dimensions.map((d) => `- ${d.label}: ${Math.round(d.score)}/100 (${d.grade || '—'})${d.summary ? ` — ${d.summary}` : ''}`),
    '',
    top.length ? `Top spending:\n${top.map((e) => `- ${e.category}: ${money(e.amount)}`).join('\n')}` : 'No expense amounts entered yet — update Finances in the app.',
    '',
    topAction ? [
      'Top priority:',
      `#1 [${topAction.priority || 'HIGH'}] ${topAction.title}`,
      topAction.detail || topAction.steps?.[0] || '',
    ].join('\n') : null,
    '',
    'Budget highlights:',
    ...bullets.map((b) => `- ${b}`),
    '',
    `Open the app to update your data: ${(process.env.CLIENT_URL || 'https://financialcheckup.app').split(',')[0].trim()}`,
    '',
    '— Financial Checkup · Operon E2I',
  ].filter((line) => line !== null).join('\n');

  return {
    username,
    month,
    subject,
    plain: txt,
    overallScore,
  };
}

module.exports = { digestForUserMonth };
