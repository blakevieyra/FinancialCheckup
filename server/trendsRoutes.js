const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbAll } = require('./db');
const { healthScore } = require('./scoring');

router.use(verifyToken);

/**
 * GET /api/me/trends?months=12
 * Monthly series merged from income + expenses history for improvement insights.
 */
router.get('/', (req, res) => {
  const limit = Math.min(36, Math.max(2, Number(req.query.months) || 12));
  const uid = req.user.id;

  const incRows = dbAll(
    'SELECT month, MAX(amount) AS amount FROM income WHERE user_id = ? GROUP BY month ORDER BY month ASC',
    [uid],
  );
  const expRows = dbAll(
    'SELECT month, SUM(amount) AS total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC',
    [uid],
  );

  const incMap = new Map(incRows.map((r) => [r.month, Number(r.amount) || 0]));
  const expMap = new Map(expRows.map((r) => [r.month, Number(r.total) || 0]));

  const months = Array.from(new Set([...incMap.keys(), ...expMap.keys()])).sort();
  const tail = months.slice(-limit);

  const series = tail.map((m) => {
    const income = incMap.get(m) ?? 0;
    const totalExpenses = expMap.get(m) ?? 0;
    const hs = healthScore(income, totalExpenses);
    return {
      month: m,
      income,
      totalExpenses,
      balance: Number((income - totalExpenses).toFixed(2)),
      expenseRatio: hs.expenseRatio != null ? Number(hs.expenseRatio.toFixed(2)) : null,
      healthScore: Number(hs.score.toFixed(2)),
      grade: hs.grade,
      eligible: hs.eligible,
    };
  });

  let improvement = null;
  if (series.length >= 2) {
    const first = series[0];
    const last = series[series.length - 1];

    /** Lower expense ratio over time ~ improvement when income semantics stable (heuristic). */
    const ratioFirst = first.expenseRatio;
    const ratioLast = last.expenseRatio;
    const deltaRatio =
      ratioFirst != null && ratioLast != null ? Number((ratioLast - ratioFirst).toFixed(2)) : null;

    const deltaScore = Number((last.healthScore - first.healthScore).toFixed(2));
    const deltaBalance = Number((last.balance - first.balance).toFixed(2));

    let direction = 'flat';
    if (deltaScore > 3 || (deltaRatio != null && deltaRatio < -3)) direction = 'improving';
    else if (deltaScore < -3 || (deltaRatio != null && deltaRatio > 3)) direction = 'declining';

    let summary = '';
    if (direction === 'improving') summary = `Health score gained ${deltaScore >= 0 ? '+' : ''}${deltaScore} pts from ${first.month} → ${last.month}.`;
    else if (direction === 'declining') summary = `Health score slipped ${deltaScore} pts from ${first.month} → ${last.month}.`;
    else summary = `Roughly steady from ${first.month} → ${last.month}; keep refining categories.`;

    if (deltaRatio != null) {
      summary += ` Expense ratio moved ${deltaRatio >= 0 ? '+' : ''}${deltaRatio} percentage points.`;
    }

    improvement = {
      fromMonth: first.month,
      toMonth: last.month,
      monthsCompared: series.length,
      healthScoreDelta: deltaScore,
      expenseRatioDelta: deltaRatio,
      balanceDelta: deltaBalance,
      direction,
      summary,
    };
  }

  res.json({
    monthsRequested: limit,
    series,
    improvement,
  });
});

module.exports = router;
