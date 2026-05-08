const nodemailer = require('nodemailer');

function smtpConfigured() {
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY && process.env.MAIL_FROM);
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
  return hasSendGrid || hasSmtp;
}

async function sendEmailPlain({ to, subject, text }) {
  const host = process.env.SMTP_HOST || 'smtp.sendgrid.net';
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const sendGridKey = process.env.SENDGRID_API_KEY;
  const user = process.env.SMTP_USER || (sendGridKey ? 'apikey' : undefined);
  const pass = process.env.SMTP_PASS || sendGridKey;
  const mailFrom = process.env.MAIL_FROM;

  if (!mailFrom || !user || !pass) {
    throw new Error(
      'Email is not configured. Set SENDGRID_API_KEY + MAIL_FROM (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASS + MAIL_FROM.',
    );
  }

  const auth = { user, pass };
  const transporter = nodemailer.createTransport({ host, port, secure, auth });

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
  });
}

module.exports = { sendEmailPlain, smtpConfigured };
