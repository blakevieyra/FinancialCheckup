const crypto = require('crypto');
const { sendEmailPlain, smtpConfigured } = require('./mailer');
const { getUserContact } = require('./userEmail');

function clientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
}

function verifyLink(token) {
  const api = (
    process.env.API_PUBLIC_URL
    || process.env.RENDER_EXTERNAL_URL
    || 'https://api.financialcheckup.app'
  ).replace(/\/$/, '');
  return `${api}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

function generateVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function sendRegistrationOtpEmail(email, username, code) {
  return sendIfConfigured(
    email,
    'Your Financial Checkup verification code',
    `Hi ${username},

Your one-time verification code is:

${code}

Enter this code in the app to finish creating your account. It expires in 15 minutes.

If you did not request this, you can ignore this email.

— Financial Checkup`,
  );
}

async function sendIfConfigured(to, subject, text) {
  if (!to || !smtpConfigured()) return { sent: false, reason: 'no_email_or_smtp' };
  try {
    await sendEmailPlain({ to, subject, text });
    return { sent: true };
  } catch (e) {
    console.error('[email]', subject, e.message);
    return { sent: false, reason: e.message };
  }
}

async function sendWelcomeEmail(userId) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  return sendIfConfigured(
    u.email,
    'Welcome to Financial Checkup',
    `Hi ${u.username},

Welcome to Financial Checkup! Your account is ready.

Sign in anytime: ${app}

Run your first checkup, track income & spending, and watch your score improve month over month.

— Financial Checkup · Operon E2I`,
  );
}

async function sendConfirmEmail(userId, token) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const link = verifyLink(token);
  return sendIfConfigured(
    u.email,
    'Confirm your Financial Checkup email',
    `Hi ${u.username},

Please confirm your email address to secure your account:

${link}

This link expires in 7 days. If you did not create an account, you can ignore this message.

— Financial Checkup`,
  );
}

async function sendSubscribedEmail(userId, plan) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  const label = plan === 'annual' ? 'Pro Annual' : 'Pro Monthly';
  return sendIfConfigured(
    u.email,
    'Your Financial Checkup Pro subscription is active',
    `Hi ${u.username},

Thank you — your ${label} subscription is now active.

Manage billing anytime in the Plan tab: ${app}/?section=plan

You now have full access to score history, AI insights, exports, forecasts, and more.

— Financial Checkup`,
  );
}

async function sendDeactivatedEmail(userId, reason = 'subscription_canceled') {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  const detail =
    reason === 'subscription_canceled'
      ? 'Your Pro subscription has ended. You are on the Free plan — your data is saved.'
      : 'Your account access has been deactivated.';
  return sendIfConfigured(
    u.email,
    'Financial Checkup — subscription update',
    `Hi ${u.username},

${detail}

View or reactivate your plan: ${app}/?section=plan

Questions? Reply to this email or contact info@operone2i.com

— Financial Checkup`,
  );
}

async function sendAiInsightsEmail(userId, plan) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false, reason: 'no_email' };

  const lines = [
    `Hi ${u.username},`,
    '',
    'Your AI Financial Checkup report is ready.',
    '',
    plan.summary || '',
    '',
    '--- CATEGORY PLANS ---',
  ];

  for (const cat of plan.categoryPlans || []) {
    lines.push('');
    lines.push(`${cat.label} — ${cat.score}/100 (${cat.status || cat.grade})`);
    for (const step of cat.optimizedPlan || []) lines.push(`  • ${step}`);
    if (cat.sources?.length) {
      lines.push('  Sources:');
      for (const s of cat.sources) lines.push(`    - ${s.title}: ${s.url}`);
    }
  }

  if (plan.specialistPlans?.length) {
    lines.push('');
    lines.push('--- SPECIALIST PLANS ---');
    for (const sp of plan.specialistPlans) {
      lines.push('');
      lines.push(`${sp.area} [${sp.priority}]`);
      if (sp.summary) lines.push(sp.summary);
      for (const step of sp.plan || []) lines.push(`  • ${step}`);
      for (const s of sp.sources || []) lines.push(`    - ${s.title}: ${s.url}`);
    }
  }

  if (plan.insights?.length) {
    lines.push('');
    lines.push('--- KEY INSIGHTS ---');
    for (const ins of plan.insights.slice(0, 8)) {
      lines.push(`• ${ins.title}: ${ins.message}`);
    }
  }

  lines.push('');
  lines.push(plan.disclaimer || 'Educational only — not investment, tax, or legal advice.');
  lines.push('');
  lines.push(`View full report: ${clientBaseUrl()}/?section=more`);
  lines.push('');
  lines.push('— Financial Checkup');

  return sendIfConfigured(
    u.email,
    `Your AI financial plan — ${plan.month || 'checkup'}`,
    lines.join('\n'),
  );
}

async function sendReportEmail(userId, { reportType, month }) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const label =
    reportType === 'csv' ? 'CSV export'
      : reportType === 'executive-pdf' ? 'Executive PDF'
        : reportType === 'business-pdf' ? 'Business documents PDF'
          : 'Report';
  return sendIfConfigured(
    u.email,
    `Your Financial Checkup ${label} is ready`,
    `Hi ${u.username},

Your ${label} for ${month} was generated successfully.

If you did not request this export, please sign in and review your account security.

— Financial Checkup`,
  );
}

module.exports = {
  generateVerifyToken,
  generateOtpCode,
  verifyLink,
  sendWelcomeEmail,
  sendConfirmEmail,
  sendRegistrationOtpEmail,
  sendSubscribedEmail,
  sendDeactivatedEmail,
  sendReportEmail,
  sendAiInsightsEmail,
  smtpConfigured,
};
