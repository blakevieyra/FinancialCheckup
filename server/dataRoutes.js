const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { verifyToken } = require('./auth');
const { dbGet, dbAll, dbRun } = require('./db');

router.use(verifyToken);

/** GET /api/me/data-export — full JSON bundle of user-entered data */
router.get('/data-export', async (req, res) => {
  try {
    const uid = req.user.id;
    const user = await dbGet(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = ?',
      [uid],
    );
    const income = await dbAll('SELECT month, amount, created_at FROM income WHERE user_id = ? ORDER BY month', [uid]);
    const expenses = await dbAll(
      'SELECT month, category, amount FROM expenses WHERE user_id = ? ORDER BY month, category',
      [uid],
    );
    const checkupProfile = await dbGet('SELECT snapshot_json, updated_at FROM checkup_profiles WHERE user_id = ?', [uid]);
    const checkupHistory = await dbAll(
      'SELECT month, overall_score, result_json, created_at FROM checkup_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 120',
      [uid],
    );
    const goals = await dbAll('SELECT id, name, goal_type, target_amount, current_amount, created_at FROM goals WHERE user_id = ?', [uid]);
    const prefs = await dbGet(
      'SELECT digest_enabled, digest_channel, digest_email, digest_weekday FROM user_preferences WHERE user_id = ?',
      [uid],
    );
    const subscription = await dbGet(
      'SELECT status, plan, current_period_end, updated_at FROM subscriptions WHERE user_id = ?',
      [uid],
    );

    let snapshot = {};
    try {
      snapshot = checkupProfile?.snapshot_json ? JSON.parse(checkupProfile.snapshot_json) : {};
    } catch {
      snapshot = {};
    }

    res.json({
      exportedAt: new Date().toISOString(),
      notice: 'You own this data. Financial Checkup does not sell your information.',
      account: {
        username: user?.username,
        email: user?.email,
        emailVerified: Boolean(user?.email_verified),
        createdAt: user?.created_at,
      },
      preferences: prefs || {},
      subscription: subscription || { status: 'free', plan: 'free' },
      income,
      expenses,
      checkupProfile: snapshot,
      checkupHistory: checkupHistory.map((h) => ({
        month: h.month,
        overallScore: h.overall_score,
        createdAt: h.created_at,
      })),
      goals,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed.' });
  }
});

/** DELETE /api/me/account — permanently delete account and all data */
router.delete('/account', async (req, res) => {
  try {
    const password = req.body?.password;
    if (!password) return res.status(400).json({ error: 'Password required to delete your account.' });

    const user = await dbGet('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ ok: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

module.exports = router;
