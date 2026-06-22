const { smtpConfigured } = require('./mailer');

function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = [];
  const required = ['JWT_SECRET', 'DATABASE_URL', 'CLIENT_URL'];
  for (const key of required) {
    if (!process.env[key]?.trim()) missing.push(key);
  }

  if (!smtpConfigured()) {
    console.warn(
      'WARN: Email (SENDGRID_API_KEY + MAIL_FROM) not configured — OTP registration and digests disabled.',
    );
  }

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    missing.push('STRIPE_WEBHOOK_SECRET (required when STRIPE_SECRET_KEY is set)');
  }

  if (missing.length) {
    console.error('FATAL: Missing required production environment variables:');
    missing.forEach((k) => console.error(`  - ${k}`));
    process.exit(1);
  }

  const clientUrls = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (clientUrls.some((u) => u.includes('localhost'))) {
    console.warn('WARN: CLIENT_URL includes localhost — set your production web URL for CORS and billing redirects.');
  }
}

module.exports = { validateProductionEnv };
