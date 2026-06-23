const crypto = require('crypto');
const { sendEmailPlain, smtpConfigured } = require('./mailer');
const { getUserContact } = require('./userEmail');
const {
  buildBrandedReportEmail,
  buildBrandedSimpleEmail,
  buildBrandedOtpEmail,
  buildBrandedConfirmEmail,
  buildBrandedAiInsightsEmail,
} = require('./emailTemplates');

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
  const app = clientBaseUrl();
  const subject = 'Your Financial Checkup verification code';
  const text = `Hi ${username},

Your one-time verification code is:

${code}

Enter this code in the app to finish creating your account. It expires in 15 minutes.

If you did not request this, you can ignore this email.

Sign in: ${app}
Support: info@operone2i.com

— Financial Checkup · Operon E2I LLC`;

  const html = buildBrandedOtpEmail({ username, code, appUrl: app });

  return sendIfConfigured(email, subject, text, html);
}

async function sendPasswordResetOtpEmail(email, username, code) {
  const app = clientBaseUrl();
  const subject = 'Your Financial Checkup reset code';
  const text = `Hi ${username},

Your password reset code is:

${code}

Enter this code in the app to choose a new password. It expires in 15 minutes.

If you did not request a password reset, you can ignore this email — your password will stay the same.

Sign in: ${app}
Support: info@operone2i.com

— Financial Checkup · Operon E2I LLC`;

  const html = buildBrandedOtpEmail({ username, code, appUrl: app });

  return sendIfConfigured(email, subject, text, html);
}

async function sendIfConfigured(to, subject, text, html) {
  if (!to || !smtpConfigured()) return { sent: false, reason: 'no_email_or_smtp' };
  try {
    await sendEmailPlain({ to, subject, text, html });
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
  const trialDays = Number(process.env.PRO_TRIAL_DAYS || 7);
  const text = `Hi ${u.username},

Welcome to Financial Checkup! Your account is ready.

You have a ${trialDays}-day Pro trial — AI insights, exports, projections, and full action plans are unlocked now.

Sign in anytime: ${app}

Run your first checkup, track income & spending, and watch your score improve month over month.

— Financial Checkup · Operon E2I`;
  const html = buildBrandedSimpleEmail({
    username: u.username,
    subtitle: 'Welcome',
    paragraphs: [
      'Welcome to Financial Checkup! Your account is ready.',
      `You have a ${trialDays}-day Pro trial — AI insights, exports, projections, and full action plans are unlocked now.`,
      'Run your first checkup, track income & spending, and watch your score improve month over month.',
    ],
    ctaHref: app,
    ctaLabel: 'Open Financial Checkup',
  });
  return sendIfConfigured(u.email, 'Welcome to Financial Checkup', text, html);
}

async function sendConfirmEmail(userId, token) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const link = verifyLink(token);
  const text = `Hi ${u.username},

Please confirm your email address to secure your account:

${link}

This link expires in 7 days. If you did not create an account, you can ignore this message.

— Financial Checkup`;
  const html = buildBrandedConfirmEmail({ username: u.username, confirmUrl: link });
  return sendIfConfigured(u.email, 'Confirm your Financial Checkup email', text, html);
}

async function sendSubscribedEmail(userId, plan) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  const label = plan === 'annual' ? 'Pro Annual' : 'Pro Monthly';
  const text = `Hi ${u.username},

Thank you — your ${label} subscription is now active.

Manage billing anytime in the Plan tab: ${app}/?section=plan

You now have full access to score history, AI insights, exports, forecasts, and more.

— Financial Checkup`;
  const html = buildBrandedSimpleEmail({
    username: u.username,
    subtitle: 'Pro subscription active',
    paragraphs: [
      `Thank you — your ${label} subscription is now active.`,
      'You now have full access to score history, AI insights, exports, forecasts, dimension reports, and more.',
      'Manage billing anytime from the Plan tab in your account.',
    ],
    ctaHref: `${app}/?section=plan`,
    ctaLabel: 'Manage your plan',
  });
  return sendIfConfigured(u.email, 'Your Financial Checkup Pro subscription is active', text, html);
}

async function sendDeactivatedEmail(userId, reason = 'subscription_canceled') {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  const detail =
    reason === 'subscription_canceled'
      ? 'Your Pro subscription has ended. You are on the Free plan — your data is saved.'
      : 'Your account access has been deactivated.';
  const text = `Hi ${u.username},

${detail}

View or reactivate your plan: ${app}/?section=plan

Questions? Reply to this email or contact info@operone2i.com

— Financial Checkup`;
  const html = buildBrandedSimpleEmail({
    username: u.username,
    subtitle: 'Subscription update',
    paragraphs: [detail, 'Your financial data is saved. You can view or reactivate your plan anytime.', 'Questions? Reply to this email or contact info@operone2i.com.'],
    ctaHref: `${app}/?section=plan`,
    ctaLabel: 'View your plan',
  });
  return sendIfConfigured(u.email, 'Financial Checkup — subscription update', text, html);
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

  const html = buildBrandedAiInsightsEmail({ username: u.username, plan });

  return sendIfConfigured(
    u.email,
    `Your AI financial plan — ${plan.month || 'checkup'}`,
    lines.join('\n'),
    html,
  );
}

async function sendSpecialistReportEmail(userId, report) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false, reason: 'no_email' };

  const title = report.title || report.area || 'Dimension report';
  const lines = [
    `Hi ${u.username},`,
    '',
    `Your ${title} report is attached below.`,
    '',
    report.summary || '',
    '',
    report.report || '',
    '',
  ];

  if (report.advice?.length) {
    lines.push('ADVICE');
    for (const a of report.advice) lines.push(`  • ${a}`);
    lines.push('');
  }
  if (report.nextSteps?.length) {
    lines.push('NEXT STEPS');
    report.nextSteps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push('');
  }
  if (report.dimensionAnalysis?.length) {
    lines.push('DIMENSION ANALYSIS');
    for (const d of report.dimensionAnalysis) {
      lines.push(`  • ${d.dimension || d.label}: ${d.analysis || d.summary || ''}`);
    }
    lines.push('');
  }
  if (report.actionRoadmap?.length) {
    lines.push('ACTION ROADMAP');
    for (const b of report.actionRoadmap) {
      lines.push(`  ${b.timeframe || b.phase}:`);
      for (const a of b.actions || []) lines.push(`    - ${a}`);
    }
    lines.push('');
  }
  if (report.riskWatchouts?.length) {
    lines.push('RISK WATCHOUTS');
    for (const r of report.riskWatchouts) lines.push(`  • ${r}`);
    lines.push('');
  }
  if (report.primaryResources?.length) {
    lines.push('PRIMARY RESOURCES');
    for (const s of report.primaryResources) lines.push(`  • ${s.title}: ${s.url}`);
    lines.push('');
  }
  if (report.sources?.length) {
    lines.push('SOURCES');
    for (const s of report.sources) lines.push(`  • ${s.title}: ${s.url}`);
    lines.push('');
  }

  lines.push(report.disclaimer || 'Educational only — not investment, tax, or legal advice.');
  lines.push('');
  lines.push(`View in app: ${clientBaseUrl()}/?section=tools`);
  lines.push('');
  lines.push('— Financial Checkup');

  const html = buildBrandedReportEmail({
    username: u.username,
    reportTitle: title,
    month: report.month,
    score: report.score,
    grade: report.grade,
    income: report.income,
    totalExpenses: report.totalExpenses,
    summary: report.summary,
    report: report.report,
    advice: report.advice,
    nextSteps: report.nextSteps,
    sources: report.sources,
    primaryResources: report.primaryResources,
    dimensionAnalysis: report.dimensionAnalysis,
    actionRoadmap: report.actionRoadmap,
    riskWatchouts: report.riskWatchouts,
    disclaimer: report.disclaimer,
    ctaHref: `${clientBaseUrl()}/?section=tools`,
    ctaLabel: 'Open report in app',
  });

  return sendIfConfigured(
    u.email,
    `Financial Checkup — ${title}${report.month ? ` (${report.month})` : ''}`,
    lines.join('\n'),
    html,
  );
}

async function sendReportEmail(userId, { reportType, month }) {
  const u = await getUserContact(userId);
  if (!u?.email) return { sent: false };
  const app = clientBaseUrl();
  const label =
    reportType === 'csv' ? 'CSV export'
      : reportType === 'executive-pdf' ? 'Executive PDF'
        : reportType === 'business-pdf' ? 'Business documents PDF'
          : 'Report';
  const text = `Hi ${u.username},

Your ${label} for ${month} was generated successfully.

If you did not request this export, please sign in and review your account security.

— Financial Checkup`;
  const html = buildBrandedSimpleEmail({
    username: u.username,
    subtitle: `${label} ready`,
    paragraphs: [
      `Your ${label} for ${month} was generated successfully.`,
      'Open Financial Checkup to download or review your exports from the Tools tab.',
      'If you did not request this export, please sign in and review your account security.',
    ],
    ctaHref: `${app}/?section=tools`,
    ctaLabel: 'Open Financial Checkup',
  });
  return sendIfConfigured(u.email, `Your Financial Checkup ${label} is ready`, text, html);
}

module.exports = {
  generateVerifyToken,
  generateOtpCode,
  verifyLink,
  sendWelcomeEmail,
  sendConfirmEmail,
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
  sendSubscribedEmail,
  sendDeactivatedEmail,
  sendReportEmail,
  sendAiInsightsEmail,
  sendSpecialistReportEmail,
  smtpConfigured,
};
