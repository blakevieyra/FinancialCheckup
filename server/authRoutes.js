const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('./db');
const { signToken, verifyToken } = require('./auth');
const { validateRegistration, validateLogin, validatePassword } = require('./authValidation');
const {
  generateVerifyToken,
  generateOtpCode,
  sendWelcomeEmail,
  sendConfirmEmail,
  sendRegistrationOtpEmail,
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

function otpExpiresAt() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

async function createUserAccount({ username, email, passwordHash }) {
  const { lastInsertRowid: userId } = await dbRun(
    `INSERT INTO users (username, password_hash, email, email_verified, email_verify_token, account_status)
     VALUES (?, ?, ?, 1, NULL, 'active')`,
    [username, passwordHash, email],
  );

  const month = new Date().toISOString().slice(0, 7);
  for (const cat of DEFAULT_CATS) {
    await dbRun(
      'INSERT INTO expenses (user_id, category, amount, month) VALUES (?, ?, 0, ?)',
      [userId, cat, month],
    );
  }
  await dbRun('INSERT INTO checkup_profiles (user_id, snapshot_json) VALUES (?, ?)', [userId, '{}']);
  await dbRun(
    `INSERT INTO user_preferences (user_id, digest_email, digest_channel, digest_enabled, digest_frequency)
     VALUES (?, ?, 'none', 0, 'weekly')
     ON CONFLICT (user_id) DO UPDATE SET digest_email = EXCLUDED.digest_email`,
    [userId, email],
  );

  sendWelcomeEmail(userId).catch(() => {});
  return { userId, username, email };
}

router.post('/register/send-code', async (req, res) => {
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

    if (!smtpConfigured()) {
      return res.status(503).json({ error: 'Email verification is not configured on the server yet. Contact info@operone2i.com.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const code = generateOtpCode();
    const expires = otpExpiresAt();

    await dbRun('DELETE FROM registration_pending WHERE LOWER(email) = ?', [email]);
    await dbRun(
      `INSERT INTO registration_pending (username, email, password_hash, verify_code, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, hash, code, expires],
    );

    const sent = await sendRegistrationOtpEmail(email, username, code);
    if (!sent.sent) {
      return res.status(502).json({ error: sent.reason || 'Could not send verification email.' });
    }

    res.json({ ok: true, message: 'Verification code sent. Check your inbox (and spam folder).' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/register/resend-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    if (!smtpConfigured()) {
      return res.status(503).json({ error: 'Email verification is not configured on the server yet. Contact info@operone2i.com.' });
    }

    const pending = await dbGet('SELECT * FROM registration_pending WHERE LOWER(email) = ?', [email]);
    if (!pending) {
      return res.status(404).json({ error: 'No pending registration for this email. Start sign-up again.' });
    }

    const code = generateOtpCode();
    const expires = otpExpiresAt();
    await dbRun(
      'UPDATE registration_pending SET verify_code = ?, expires_at = ? WHERE id = ?',
      [code, expires, pending.id],
    );

    const sent = await sendRegistrationOtpEmail(email, pending.username, code);
    if (!sent.sent) {
      return res.status(502).json({ error: sent.reason || 'Could not send verification email.' });
    }

    res.json({ ok: true, message: 'New verification code sent. Check your inbox and spam folder.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/register/verify', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').replace(/\D/g, '').trim();

    if (!email || !code || code.length !== 6) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const pending = await dbGet(
      'SELECT * FROM registration_pending WHERE LOWER(email) = ? AND verify_code = ?',
      [email, code],
    );
    if (!pending) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await dbRun('DELETE FROM registration_pending WHERE id = ?', [pending.id]);
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    if (await dbGet('SELECT id FROM users WHERE username = ?', [pending.username])) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    if (await dbGet('SELECT id FROM users WHERE LOWER(email) = ?', [email])) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { userId, username } = await createUserAccount({
      username: pending.username,
      email: pending.email,
      passwordHash: pending.password_hash,
    });

    await dbRun('DELETE FROM registration_pending WHERE id = ?', [pending.id]);

    res.status(201).json({
      token: signToken({ id: userId, username }),
      username,
      userId,
      email: pending.email,
      emailVerified: true,
      message: 'Account created.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

/** Legacy one-step register — disabled in production; OTP flow required when SMTP is configured. */
router.post('/register', async (req, res) => {
  if (process.env.NODE_ENV === 'production' || smtpConfigured()) {
    return res.status(400).json({
      error: 'Use email verification. Submit the form to receive a one-time code.',
      code: 'OTP_REQUIRED',
    });
  }

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
    const { userId, username: uname } = await createUserAccount({ username, email, passwordHash: hash });

    res.status(201).json({
      token: signToken({ id: userId, username: uname }),
      username: uname,
      userId,
      email,
      emailVerified: true,
      message: 'Account created.',
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

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const user = await dbGet('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
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
