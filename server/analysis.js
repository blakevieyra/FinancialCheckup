/** Deterministic budgeting insights (no AI). Mirrors client grade bands. */

function gradeFromExpenseRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio < 0) return 'N/A';
  if (ratio < 30) return 'A';
  if (ratio < 50) return 'B';
  if (ratio < 65) return 'C';
  if (ratio < 80) return 'D';
  return 'F';
}

function buildBudgetBullets({ income, expenses }) {
  const inc = Number(income) || 0;
  const lines = [];
  const pos = (expenses || []).filter((e) => Number(e.amount) > 0);
  const totalExp = pos.reduce((s, e) => s + Number(e.amount), 0);
  const ratio = inc > 0 ? (totalExp / inc) * 100 : 0;

  if (inc <= 0) lines.push('Set your monthly income so we can benchmark spending.');
  else if (totalExp <= 0) lines.push('Add expense amounts so this report can benchmark your ratios.');

  if (totalExp <= 0) return lines;

  lines.push(`Budget grade (${gradeFromExpenseRatio(ratio)}): expense ratio ${ratio.toFixed(1)}%.`);

  if (inc > 0 && totalExp > inc) lines.push(`You are spending ${(totalExp - inc).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} more than income this month.`);

  const avg = totalExp > 0 && pos.length ? totalExp / pos.length : 0;
  const amounts = pos.map((e) => Number(e.amount)).sort((a, b) => a - b);
  const variance = amounts.reduce((acc, val) => acc + ((val - avg) ** 2), 0) / Math.max(amounts.length, 1);
  const cv = avg > 0 ? (Math.sqrt(variance) / avg) * 100 : 0;
  if (cv > 50 && amounts.length > 1) lines.push('Spending is uneven across categories — consider stabilizing big swings.');

  const maxLine = pos.reduce((m, e) => (Number(e.amount) > Number(m.amount) ? e : m), pos[0]);
  if (inc > 0 && maxLine && Number(maxLine.amount) > 0.4 * inc) {
    lines.push(`Your largest expense (${maxLine.category}) is over 40% of income — check sustainability.`);
  }

  pos
    .filter((e) => totalExp > 0 && (Number(e.amount) / totalExp) * 100 > 18)
    .slice(0, 4)
    .forEach((e) => lines.push(`${e.category} is ${Math.round((Number(e.amount) / totalExp) * 100)}% of total expenses — revisit for savings.`));

  return lines.slice(0, 8);
}

module.exports = { gradeFromExpenseRatio, buildBudgetBullets };
