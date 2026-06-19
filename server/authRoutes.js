const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('./db');
const { signToken, verifyToken } = require('./auth');
const { validateRegistration, validateLogin } = require('./authValidation');
const {
  generateVerifyToken,
  sendWelcomeEmail,
  sendConfirmEmail,
  smtpConfigured,
} = require('./transactionalEmail');

const DEFAULT_CATS = [
  '🏠 Housing','💡 Electricity','💧 Water','🌐 Internet','📱 Phone',
  '⛽ Gas','📺 Subscriptions','🚗 Transportation','🛡️ Insurance',
  '💳 Credit Cards','🛒 Groceries','🍽️ Dining Out','🎬 Entertainment',
  '💰 Savings','📉 Loan Payments','📦 Other'
];

function clientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
}

router.post('/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;

    const v = validateRegistration({ username, password, email });
    if (!v.ok) {
      const first = Object.values(v.errors)[0];
      return res.status(400).json({ error: first, errors: v.errors });
    }

    if (await dbGet('SELECT id FROM users WHERE username = ?', [username])) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    if (await dbGet('SELECT id FROM users WHERE LOWER(email) = ?', [email])) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = generateVerifyToken();
    const { lastInsertRowid: userId } = await dbRun(
      `INSERT INTO users (username, password_hash, email, email_verified, email_verify_token, account_status)
       VALUES (?, ?, ?, 0, ?, 'active')`,
      [username, hash, email, verifyToken],
    );

    const month = new Date().toISOString().slice(0, 7);
    for (const cat of DEFAULT_CATS) {
      await dbRun(
        'INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)',
        [userId, cat, month],
      );
    }
    await dbRun('INSERT INTO checkup_profiles (user_id, snapshot_json) VALUES (?, ?)', [userId, '{}']);
    await dbRun('INSERT INTO subscriptions (user_id, status, plan) VALUES (?, ?, ?)', [userId, 'free', 'free']);
    await dbRun(
      `INSERT INTO user_preferences (user_id, digest_email) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET digest_email = EXCLUDED.digest_email`,
      [userId, email],
    );

    sendConfirmEmail(userId, verifyToken).catch(() => {});
    if (!smtpConfigured()) {
      await dbRun('UPDATE users SET email_verified = 1, email_verify_token = NULL WHERE id = ?', [userId]);
      sendWelcomeEmail(userId).catch(() => {});
    }

    res.status(201).json({
      token: signToken({ id: userId, username }),
      username,
      userId,
      email,
      emailVerified: !smtpConfigured(),
      message: smtpConfigured()
        ? 'Account created. Check your email to confirm your address.'
        : 'Account created.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;
    const loginErr = validateLogin({ username, password });
    if (loginErr) return res.status(400).json({ error: loginErr });

    const user = await dbGet(
      'SELECT id, password_hash, email, email_verified, account_status FROM users WHERE username = ?',
      [username],
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (user.account_status === 'deactivated') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact support@operone2i.com.' });
    }

    res.json({
      token: signToken({ id: user.id, username }),
      username,
      userId: user.id,
      email: user.email || null,
      emailVerified: Boolean(user.email_verified),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.redirect(`${clientBaseUrl()}/?verify=missing`);

    const user = await dbGet('SELECT id, email_verified FROM users WHERE email_verify_token = ?', [token]);
    if (!user) return res.redirect(`${clientBaseUrl()}/?verify=invalid`);

    await dbRun('UPDATE users SET email_verified = 1, email_verify_token = NULL WHERE id = ?', [user.id]);
    if (!user.email_verified) sendWelcomeEmail(user.id).catch(() => {});

    return res.redirect(`${clientBaseUrl()}/?verified=1`);
  } catch (e) {
    console.error(e);
    return res.redirect(`${clientBaseUrl()}/?verify=error`);
  }
});

router.post('/resend-verify', verifyToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, email, email_verified, email_verify_token FROM users WHERE id = ?',
      [req.user.id],
    );
    if (!user?.email) return res.status(400).json({ error: 'No email on file. Update your profile.' });
    if (user.email_verified) return res.json({ ok: true, message: 'Email already verified.' });

    let token = user.email_verify_token;
    if (!token) {
      token = generateVerifyToken();
      await dbRun('UPDATE users SET email_verify_token = ? WHERE id = ?', [token, user.id]);
    }
    await sendConfirmEmail(user.id, token);
    res.json({ ok: true, message: 'Confirmation email sent.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Could not send email.' });
  }
});

module.exports = router;
