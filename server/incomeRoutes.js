const router = require('express').Router();
const { dbGet, dbRun, dbAll } = require('./db');
const { verifyToken } = require('./auth');
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const m = req.query.month || new Date().toISOString().slice(0, 7);
    const row = await dbGet(
      'SELECT amount FROM income WHERE user_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id, m],
    );
    res.json({ amount: row?.amount ?? 0, month: m });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/history', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT month, MAX(amount) as amount FROM income WHERE user_id = ? GROUP BY month ORDER BY month ASC LIMIT 12',
      [req.user.id],
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { amount: rawAmount, month } = req.body;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount.' });
    const m = month || new Date().toISOString().slice(0, 7);
    const existing = await dbGet('SELECT id FROM income WHERE user_id = ? AND month = ?', [req.user.id, m]);
    if (existing) await dbRun('UPDATE income SET amount = ? WHERE user_id = ? AND month = ?', [amount, req.user.id, m]);
    else await dbRun('INSERT INTO income (user_id, amount, month) VALUES (?, ?, ?)', [req.user.id, amount, m]);
    res.json({ amount, month: m });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
