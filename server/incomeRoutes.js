const router = require('express').Router();
const { dbGet, dbRun, dbAll } = require('./db');
const { verifyToken } = require('./auth');
router.use(verifyToken);

function parseSources(raw) {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr
      .map((row, i) => ({
        id: row.id || `src-${i}`,
        label: String(row.label || 'Income').trim().slice(0, 80) || 'Income',
        amount: Math.max(0, Number(row.amount) || 0),
      }))
      .filter((row) => row.label);
  } catch {
    return null;
  }
}

function sumSources(sources) {
  return (sources || []).reduce((total, row) => total + (Number(row.amount) || 0), 0);
}

function normalizeSourcesFromBody(bodySources, amount) {
  if (Array.isArray(bodySources) && bodySources.length) {
    const parsed = bodySources
      .map((row, i) => ({
        id: row.id || `src-${i}`,
        label: String(row.label || 'Income').trim().slice(0, 80) || 'Income',
        amount: Math.max(0, Number(row.amount) || 0),
      }))
      .filter((row) => row.label);
    if (parsed.length) return parsed;
  }
  const amt = Number(amount);
  if (Number.isFinite(amt) && amt >= 0) {
    return [{ id: 'primary', label: 'Income', amount: amt }];
  }
  return [];
}

router.get('/', async (req, res) => {
  try {
    const m = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) return res.status(400).json({ error: 'month must be YYYY-MM.' });
    const row = await dbGet(
      'SELECT amount, sources FROM income WHERE user_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id, m],
    );
    const amount = Number(row?.amount) || 0;
    let sources = parseSources(row?.sources);
    if (!sources?.length && amount > 0) {
      sources = [{ id: 'primary', label: 'Income', amount }];
    }
    res.json({ amount, month: m, sources: sources || [] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/history', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT month, MAX(amount) as amount FROM income WHERE user_id = ? AND amount > 0 GROUP BY month ORDER BY month DESC LIMIT 24',
      [req.user.id],
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { amount: rawAmount, month, sources: bodySources } = req.body;
    const m = month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) return res.status(400).json({ error: 'month must be YYYY-MM.' });

    const sources = normalizeSourcesFromBody(bodySources, rawAmount);
    const amount = sources.length ? sumSources(sources) : Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount.' });

    const sourcesJson = sources.length ? JSON.stringify(sources) : null;
    const existing = await dbGet('SELECT id FROM income WHERE user_id = ? AND month = ?', [req.user.id, m]);
    if (existing) {
      await dbRun(
        'UPDATE income SET amount = ?, sources = ? WHERE user_id = ? AND month = ?',
        [amount, sourcesJson, req.user.id, m],
      );
    } else {
      await dbRun(
        'INSERT INTO income (user_id, amount, month, sources) VALUES (?, ?, ?, ?)',
        [req.user.id, amount, m, sourcesJson],
      );
    }
    res.json({ amount, month: m, sources });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
