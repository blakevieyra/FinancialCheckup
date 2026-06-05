const pathEnv = require('path');
require('dotenv').config({ path: pathEnv.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initDb, closeDb } = require('./db');
const startDigestScheduler = require('./digestScheduler');
const { runScheduledDigestsForWeekday } = require('./digestDeliver');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * CLIENT_URL accepts a comma-separated list of allowed browser origins.
 * Apex + www of a custom domain count as DIFFERENT origins to the browser, so production
 * typically needs both (e.g. "https://financialcheckup.app,https://www.financialcheckup.app").
 * Localhost dev origin is always allowed so `npm run dev` keeps working.
 */
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      /** Same-origin / curl / server-to-server requests have no Origin header — allow them. */
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not in CLIENT_URL allow-list.`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api/auth',      require('./authRoutes'));
app.use('/api/me/digest', require('./digestRoutes'));
app.use('/api/income',   require('./incomeRoutes'));
app.use('/api/expenses', require('./expenseRoutes'));
app.use('/api/ai',       require('./aiRoutes'));
app.use('/api/reports',  require('./reportsRoutes'));
app.use('/api/expert',   require('./expertRoutes'));
app.use('/api/rankings', require('./rankingsRoutes'));
app.use('/api/me/trends', require('./trendsRoutes'));
app.use('/api/me/financial-advice', require('./financialAdviceRoutes'));
app.use('/api/goals', require('./goalsRoutes'));
app.use('/api/checkup', require('./checkupRoutes'));
app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    /** Lets clients confirm this process includes weekly-digest routes (GET/PUT /api/me/digest). */
    features: { weeklyDigest: true, trends: true, leaderboard: true, postgres: true, sixDimensionCheckup: true },
  }),
);

/** Optional VPS/cron bridge: POST { "secret":"<ADMIN_DIGEST_SECRET>" } — never expose secret publicly */
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

    /** Drain pool + close server cleanly on SIGTERM/SIGINT (Render restarts send SIGTERM). */
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
