const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./auth');
const { dbGet } = require('./db');
const { sendEmailPlain, smtpConfigured } = require('./mailer');

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many support requests. Try again later.' },
});

const SUPPORT_TO = process.env.SUPPORT_EMAIL || 'info@operone2i.com';

router.post('/', supportLimiter, verifyToken, async (req, res) => {
  try {
    if (!smtpConfigured()) {
      return res.status(503).json({ error: 'Support email is not configured on the server yet.' });
    }

    const subject = String(req.body?.subject || '').trim().slice(0, 120);
    const message = String(req.body?.message || '').trim().slice(0, 4000);

    if (!subject) return res.status(400).json({ error: 'Subject is required.' });
    if (message.length < 10) return res.status(400).json({ error: 'Please enter at least 10 characters in your message.' });

    const user = await dbGet('SELECT username, email FROM users WHERE id = ?', [req.user.id]);
    const fromEmail = user?.email || 'unknown';
    const username = user?.username || req.user.username || 'user';

    const body = [
      `Support request from Financial Checkup`,
      '',
      `User: ${username} (id ${req.user.id})`,
      `Email: ${fromEmail}`,
      '',
      `Subject: ${subject}`,
      '',
      '--- Message ---',
      message,
      '',
      '---',
      `Sent ${new Date().toISOString()}`,
    ].join('\n');

    await sendEmailPlain({
      to: SUPPORT_TO,
      subject: `[Support] ${subject} — ${username}`,
      text: body,
      replyTo: fromEmail.includes('@') ? fromEmail : undefined,
    });

    res.json({ ok: true, message: 'Message sent. We typically reply within 1–2 business days.' });
  } catch (e) {
    console.error('[support]', e);
    res.status(500).json({ error: e.message || 'Could not send message.' });
  }
});

module.exports = router;
