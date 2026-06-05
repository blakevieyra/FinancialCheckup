const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbGet, dbAll, dbRun } = require('./db');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { runCheckup, prefillFromLedger, extractExtendedProfile, mergeSnapshotWithLedger } = require('./checkupEngine');

/** Public preview — no account required (matches landing “free to start”). */
router.post('/preview', (req, res) => {
  try {
    const result = runCheckup(req.body || {});
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Invalid checkup payload.' });
  }
});

router.use(verifyToken);

router.get('/prefill', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const ledger = await snapshotForUserMonth(req.user.id, month);
    const saved = await dbGet(
      'SELECT snapshot_json FROM checkup_profiles WHERE user_id = ?',
      [req.user.id],
    );
    let savedExtended = {};
    if (saved?.snapshot_json) {
      try {
        savedExtended = extractExtendedProfile(JSON.parse(saved.snapshot_json));
      } catch {
        savedExtended = {};
      }
    }
    return res.json({
      month,
      ledger: { income: ledger.income, totalExpenses: ledger.totalExpenses, expenses: ledger.expenses },
      extended: savedExtended,
      template: mergeSnapshotWithLedger(ledger, savedExtended),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/run', async (req, res) => {
  try {
    const month = req.body?.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const ledger = await snapshotForUserMonth(req.user.id, month);
    const saved = await dbGet(
      'SELECT snapshot_json FROM checkup_profiles WHERE user_id = ?',
      [req.user.id],
    );
    let savedExtended = {};
    if (saved?.snapshot_json) {
      try {
        savedExtended = extractExtendedProfile(JSON.parse(saved.snapshot_json));
      } catch {
        savedExtended = {};
      }
    }
    const clientExtended = extractExtendedProfile(req.body?.snapshot || req.body || {});
    const merged = mergeSnapshotWithLedger(ledger, { ...savedExtended, ...clientExtended });
    const result = runCheckup(merged);

    await dbRun(
      `INSERT INTO checkup_profiles (user_id, snapshot_json, updated_at)
       VALUES (?, ?, to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ON CONFLICT (user_id) DO UPDATE SET
         snapshot_json = EXCLUDED.snapshot_json,
         updated_at = EXCLUDED.updated_at`,
      [req.user.id, JSON.stringify(extractExtendedProfile(result.snapshot))],
    );

    await dbRun(
      `INSERT INTO checkup_history (user_id, month, snapshot_json, result_json, overall_score)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, month, JSON.stringify(result.snapshot), JSON.stringify(result), result.overallScore],
    );

    return res.json({ ok: true, month, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Checkup failed.' });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const month = req.query.month;
    const params = [req.user.id];
    let sql =
      'SELECT month, overall_score, result_json, created_at FROM checkup_history WHERE user_id = ?';
    if (month) {
      sql += ' AND month = ?';
      params.push(month);
    }
    sql += ' ORDER BY created_at DESC LIMIT 1';
    const row = await dbGet(sql, params);
    if (!row) return res.json({ found: false });
    let result = null;
    try {
      result = JSON.parse(row.result_json);
    } catch {
      result = null;
    }
    return res.json({
      found: true,
      month: row.month,
      overallScore: row.overall_score,
      createdAt: row.created_at,
      result,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(36, Math.max(1, Number(req.query.limit) || 24));
    const rows = await dbAll(
      `SELECT month, overall_score, snapshot_json, result_json, created_at
       FROM checkup_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, limit],
    );
    return res.json({
      history: rows.map((r) => {
        let snap = {};
        let result = {};
        try {
          snap = JSON.parse(r.snapshot_json || '{}');
        } catch {
          snap = {};
        }
        try {
          result = JSON.parse(r.result_json || '{}');
        } catch {
          result = {};
        }
        const income = Number(snap.income) || 0;
        const expenses = Number(snap.monthlyExpenses) || 0;
        return {
          month: r.month,
          overallScore: Number(r.overall_score),
          createdAt: r.created_at,
          income,
          expenses,
          surplus: income - expenses,
          topRecommendations: (result.actionPlan || []).slice(0, 3).map((i) => i.title),
        };
      }),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/** Newsletter / free money tips — stores email on user preferences. */
router.post('/tips-signup', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required.' });
    }
    await dbRun(
      `INSERT INTO user_preferences (user_id, digest_email)
       VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET digest_email = EXCLUDED.digest_email`,
      [req.user.id, email],
    );
    return res.json({ ok: true, message: 'Subscribed to free money tips.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
