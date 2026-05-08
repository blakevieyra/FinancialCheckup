const pathEnv = require('path');
require('dotenv').config({ path: pathEnv.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const startDigestScheduler = require('./digestScheduler');
const { runScheduledDigestsForWeekday } = require('./digestDeliver');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
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
app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    /** Lets clients confirm this process includes weekly-digest routes (GET/PUT /api/me/digest). */
    features: { weeklyDigest: true, trends: true, leaderboard: true },
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

initDb().then(() => {
  startDigestScheduler();
  app.listen(PORT, () => console.log(`✓ FinancialCheckup API → http://localhost:${PORT}`));
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
