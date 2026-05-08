const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('./db');
const { signToken } = require('./auth');

const DEFAULT_CATS = [
  '🏠 Housing','💡 Electricity','💧 Water','🌐 Internet','📱 Phone',
  '⛽ Gas','📺 Subscriptions','🚗 Transportation','🛡️ Insurance',
  '💳 Credit Cards','🛒 Groceries','🍽️ Dining Out','🎬 Entertainment',
  '💰 Savings','📉 Loan Payments','📦 Other'
];

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password || password.length < 6)
      return res.status(400).json({ error: 'Username and password (min 6 chars) required.' });
    if (dbGet('SELECT id FROM users WHERE username = ?', [username]))
      return res.status(409).json({ error: 'Username already taken.' });
    const hash = await bcrypt.hash(password, 12);
    const { lastInsertRowid: userId } = dbRun(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]
    );
    const month = new Date().toISOString().slice(0, 7);
    DEFAULT_CATS.forEach(cat =>
      dbRun('INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)', [userId, cat, month])
    );
    res.status(201).json({ token: signToken({ id: userId, username }), username });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = dbGet('SELECT id, password_hash FROM users WHERE username = ?', [username]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials.' });
    res.json({ token: signToken({ id: user.id, username }), username });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
