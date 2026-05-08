const router = require('express').Router();
const { dbGet, dbRun, dbAll } = require('./db');
const { verifyToken } = require('./auth');
router.use(verifyToken);

router.get('/', (req, res) => {
  const m = req.query.month || new Date().toISOString().slice(0, 7);
  let rows = dbAll('SELECT id, category, amount, month FROM expenses WHERE user_id = ? AND month = ? ORDER BY category', [req.user.id, m]);
  if (rows.length === 0) {
    const cats = dbAll('SELECT DISTINCT category FROM expenses WHERE user_id = ? ORDER BY category', [req.user.id]);
    if (cats.length > 0) {
      cats.forEach(r => dbRun('INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)', [req.user.id, r.category, m]));
      rows = dbAll('SELECT id, category, amount, month FROM expenses WHERE user_id = ? AND month = ? ORDER BY category', [req.user.id, m]);
    }
  }
  res.json(rows);
});

router.put('/', (req, res) => {
  const { expenses, month } = req.body;
  if (!Array.isArray(expenses)) return res.status(400).json({ error: 'expenses array required.' });
  const m = month || new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString();
  expenses.forEach(({ category, amount }) => {
    const ex = dbGet('SELECT id FROM expenses WHERE user_id = ? AND category = ? AND month = ?', [req.user.id, category, m]);
    if (ex) dbRun('UPDATE expenses SET amount = ?, updated_at = ? WHERE user_id = ? AND category = ? AND month = ?', [amount, now, req.user.id, category, m]);
    else dbRun('INSERT INTO expenses (user_id, category, amount, month, updated_at) VALUES (?, ?, ?, ?, ?)', [req.user.id, category, amount, m, now]);
  });
  res.json({ success: true });
});

router.post('/category', (req, res) => {
  const { category, month } = req.body;
  const m = month || new Date().toISOString().slice(0, 7);
  if (!category?.trim()) return res.status(400).json({ error: 'Category name required.' });
  if (dbGet('SELECT id FROM expenses WHERE user_id = ? AND category = ? AND month = ?', [req.user.id, category.trim(), m]))
    return res.status(409).json({ error: 'Category exists.' });
  dbRun('INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)', [req.user.id, category.trim(), m]);
  res.status(201).json({ success: true });
});

router.delete('/category', (req, res) => {
  const { category, month } = req.body;
  const m = month || new Date().toISOString().slice(0, 7);
  dbRun('DELETE FROM expenses WHERE user_id = ? AND category = ? AND month = ?', [req.user.id, category, m]);
  res.json({ success: true });
});

router.get('/history', (req, res) => {
  const rows = dbAll('SELECT month, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC LIMIT 12', [req.user.id]);
  res.json(rows);
});

module.exports = router;
