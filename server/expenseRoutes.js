const router = require('express').Router();
const { dbGet, dbRun, dbAll } = require('./db');
const { verifyToken } = require('./auth');
router.use(verifyToken);

const PROFILE_DEFAULTS = {
  personal: ['Housing', 'Groceries', 'Transportation', 'Utilities', 'Insurance', 'Debt Payments', 'Savings', 'Healthcare', 'Dining Out', 'Entertainment'],
  business: ['Payroll', 'Rent', 'Utilities', 'Software', 'Marketing', 'Travel', 'Contractors', 'Insurance', 'Taxes', 'Office Supplies'],
  organizational: ['Program Services', 'Administrative', 'Fundraising', 'Staff', 'Occupancy', 'Technology', 'Insurance', 'Professional Fees', 'Grants', 'Reserves'],
};

router.get('/', async (req, res) => {
  try {
    const m = req.query.month || new Date().toISOString().slice(0, 7);
    const profile = String(req.query.profile || 'personal');
    let rows = await dbAll(
      'SELECT id, category, amount, month FROM expenses WHERE user_id = ? AND month = ? ORDER BY category',
      [req.user.id, m],
    );
    if (rows.length === 0) {
      const cats = await dbAll(
        'SELECT DISTINCT category FROM expenses WHERE user_id = ? ORDER BY category',
        [req.user.id],
      );
      const seed = cats.length > 0 ? cats.map((r) => r.category) : (PROFILE_DEFAULTS[profile] || PROFILE_DEFAULTS.personal);
      for (const category of seed) {
        await dbRun(
          'INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)',
          [req.user.id, category, m],
        );
      }
      rows = await dbAll(
        'SELECT id, category, amount, month FROM expenses WHERE user_id = ? AND month = ? ORDER BY category',
        [req.user.id, m],
      );
    }
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/', async (req, res) => {
  try {
    const { expenses, month } = req.body;
    if (!Array.isArray(expenses)) return res.status(400).json({ error: 'expenses array required.' });
    const m = month || new Date().toISOString().slice(0, 7);
    const now = new Date().toISOString();
    for (const { category, amount } of expenses) {
      const amt = Number(amount) || 0;
      const ex = await dbGet(
        'SELECT id FROM expenses WHERE user_id = ? AND category = ? AND month = ?',
        [req.user.id, category, m],
      );
      if (ex) {
        await dbRun(
          'UPDATE expenses SET amount = ?, updated_at = ? WHERE user_id = ? AND category = ? AND month = ?',
          [amt, now, req.user.id, category, m],
        );
      } else {
        await dbRun(
          'INSERT INTO expenses (user_id, category, amount, month, updated_at) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, category, amt, m, now],
        );
      }
      await dbRun(
        'INSERT INTO expenses_log (user_id, category, amount, month, logged_at, source) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, category, amt, m, now, 'manual'],
      );
    }
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/category', async (req, res) => {
  try {
    const { category, month } = req.body;
    const m = month || new Date().toISOString().slice(0, 7);
    if (!category?.trim()) return res.status(400).json({ error: 'Category name required.' });
    const existing = await dbGet(
      'SELECT id FROM expenses WHERE user_id = ? AND category = ? AND month = ?',
      [req.user.id, category.trim(), m],
    );
    if (existing) return res.status(409).json({ error: 'Category exists.' });
    await dbRun(
      'INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)',
      [req.user.id, category.trim(), m],
    );
    res.status(201).json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/category', async (req, res) => {
  try {
    const { category, month } = req.body;
    const m = month || new Date().toISOString().slice(0, 7);
    await dbRun(
      'DELETE FROM expenses WHERE user_id = ? AND category = ? AND month = ?',
      [req.user.id, category, m],
    );
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/history', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT month, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT 24',
      [req.user.id],
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
