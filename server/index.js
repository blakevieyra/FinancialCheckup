const pathEnv = require('path');
require('dotenv').config({ path: pathEnv.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb, closeDb } = require('./db');
const startDigestScheduler = require('./digestScheduler');
const { runScheduledDigestsForWeekday } = require('./digestDeliver');
const { router: billingRouter, stripeWebhook } = require('./billingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Capacitor Android/iOS WebView origins (Play Store app). */
const MOBILE_APP_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost'];

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || MOBILE_APP_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not in CLIENT_URL allow-list.`));
    },
    credentials: true,
  }),
);

/** Stripe webhook must receive raw body — register before express.json(). */
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '512kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/register/send-code', authLimiter);
app.use('/api/auth/register/resend-code', authLimiter);
app.use('/api/auth/register/verify', authLimiter);

app.use('/api/auth', require('./authRoutes'));
app.use('/api/billing', billingRouter);
app.use('/api/me/digest', require('./digestRoutes'));
app.use('/api/me', require('./dataRoutes'));
app.use('/api/income', require('./incomeRoutes'));
app.use('/api/expenses', require('./expenseRoutes'));
app.use('/api/ai', require('./aiRoutes'));
app.use('/api/reports', require('./reportsRoutes'));
app.use('/api/expert', require('./expertRoutes'));
app.use('/api/rankings', require('./rankingsRoutes'));
app.use('/api/me/trends', require('./trendsRoutes'));
app.use('/api/me/financial-advice', require('./financialAdviceRoutes'));
app.use('/api/goals', require('./goalsRoutes'));
app.use('/api/checkup', require('./checkupRoutes'));
app.use('/api/market', require('./marketRoutes'));
app.use('/api/support', require('./supportRoutes'));
app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    features: {
      weeklyDigest: true,
      trends: true,
      leaderboard: true,
      postgres: true,
      sixDimensionCheckup: true,
      stripeBilling: Boolean(process.env.STRIPE_SECRET_KEY),
    billingRoutes: [
      'GET /api/billing/status',
      'POST /api/billing/checkout',
      'POST /api/billing/start-trial',
      'POST /api/billing/welcome-trial',
      'POST /api/billing/sync',
      'POST /api/billing/portal',
    ],
      anthropicAi: Boolean(process.env.ANTHROPIC_API_KEY),
      anthropicModel: require('./anthropicClient').modelName(),
      emailConfigured: require('./mailer').smtpConfigured(),
    },
  }),
);

app.post('/api/internal/digest-run', async (req, res) => {
  const secret = process.env.ADMIN_DIGEST_SECRET;
  if (!secret) return res.status(404).json({ error: 'Not found.' });
  if (req.body?.secret !== secret) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const r = await runScheduledDigestsForWeekday();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Digest runner failed.' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

initDb()
  .then(() => {
    startDigestScheduler();
    const server = app.listen(PORT, () =>
      console.log(`✓ FinancialCheckup API → http://localhost:${PORT}`),
    );

    const shutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down...`);
      server.close(() => console.log('HTTP server closed.'));
      try {
        await closeDb();
        console.log('Postgres pool drained.');
      } catch (e) {
        console.error('Pool drain error:', e.message);
      }
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
