const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbAll, dbGet, dbRun } = require('./db');

router.use(verifyToken);

function toApi(row) {
  const target = Number(row.target_amount) || 0;
  const current = Number(row.current_amount) || 0;
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return {
    id: row.id,
    name: row.name,
    goalType: row.goal_type,
    targetAmount: target,
    currentAmount: current,
    targetMonth: row.target_month || '',
    status: row.status || 'active',
    progressPercent: Number(progress.toFixed(1)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY status ASC, updated_at DESC, id DESC',
      [req.user.id],
    );
    res.json(rows.map(toApi));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const goalType = String(req.body?.goalType || 'custom').trim().toLowerCase();
    const targetAmount = Number(req.body?.targetAmount);
    const currentAmount = 0;
    const targetMonth = null;
    const status = req.body?.status ? String(req.body.status) : 'active';

    if (!name) return res.status(400).json({ error: 'Goal name is required.' });
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ error: 'targetAmount must be > 0.' });
    }
    if (!['active', 'completed', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, completed, or paused.' });
    }

    const now = new Date().toISOString();
    const inserted = await dbRun(
      `INSERT INTO goals (user_id, name, goal_type, target_amount, current_amount, target_month, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, goalType, targetAmount, currentAmount, targetMonth, status, now],
    );
    const row = await dbGet(
      'SELECT * FROM goals WHERE id = ? AND user_id = ?',
      [inserted.lastInsertRowid, req.user.id],
    );
    res.status(201).json(toApi(row));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid goal id.' });
    const existing = await dbGet('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Goal not found.' });

    const name = req.body?.name != null ? String(req.body.name).trim() : existing.name;
    const goalType = req.body?.goalType != null ? String(req.body.goalType).trim().toLowerCase() : existing.goal_type;
    const targetAmount = req.body?.targetAmount != null ? Number(req.body.targetAmount) : Number(existing.target_amount);
    const currentAmount = req.body?.currentAmount != null ? Number(req.body.currentAmount) : Number(existing.current_amount);
    const targetMonth = existing.target_month;
    const status = req.body?.status != null ? String(req.body.status) : existing.status;

    if (!name) return res.status(400).json({ error: 'Goal name is required.' });
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ error: 'targetAmount must be > 0.' });
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      return res.status(400).json({ error: 'currentAmount must be >= 0.' });
    }
    if (!['active', 'completed', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, completed, or paused.' });
    }

    await dbRun(
      `UPDATE goals
       SET name = ?, goal_type = ?, target_amount = ?, current_amount = ?, target_month = ?, status = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [name, goalType, targetAmount, currentAmount, targetMonth, status, new Date().toISOString(), id, req.user.id],
    );
    const row = await dbGet('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json(toApi(row));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid goal id.' });
    await dbRun('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
