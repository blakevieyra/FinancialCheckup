const router = require('express').Router();
const { verifyToken } = require('./auth');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { healthScore } = require('./scoring');

router.use(verifyToken);

async function fetchFreeMoneyAdvice() {
  try {
    const res = await fetch('https://api.adviceslip.com/advice/search/money');
    if (!res.ok) throw new Error(`Advice API ${res.status}`);
    const data = await res.json();
    const slips = Array.isArray(data?.slips) ? data.slips : [];
    return slips
      .map((s) => String(s?.advice || '').trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

router.get('/', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const snap = await snapshotForUserMonth(req.user.id, month);
    const hs = healthScore(snap.income, snap.totalExpenses);
    const externalAdvice = await fetchFreeMoneyAdvice();

    const localAdvice = [...(snap.deterministicTips || [])]
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 4);

    return res.json({
      month,
      source: {
        externalApi: 'api.adviceslip.com',
        externalCount: externalAdvice.length,
      },
      metrics: {
        income: snap.income,
        totalExpenses: snap.totalExpenses,
        balance: snap.balance,
        expenseRatio: Number((hs.expenseRatio ?? 0).toFixed(1)),
        healthScore: Number(hs.score.toFixed(1)),
        grade: hs.grade,
      },
      advice: {
        external: externalAdvice,
        internal: localAdvice,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
