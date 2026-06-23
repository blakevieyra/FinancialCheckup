const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { verifyToken } = require('./auth');
const { dbGet, dbAll, dbRun } = require('./db');
const { cancelStripeBillingForUser } = require('./billingRoutes');

router.use(verifyToken);

const { XP_REWARDS, levelFromXp, scaledXpReward, levelUpBonus, xpProgressForTotal, computeBaselineXp } = require('./progression');

/** GET /api/me/profile — lightweight session identity */
router.get('/profile', async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, email_verified FROM users WHERE id = ?',
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      userId: user.id,
      username: user.username,
      email: user.email || null,
      emailVerified: Boolean(user.email_verified),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

/** GET /api/me/progress — XP synced to account (not browser-only) */
router.get('/progress', async (req, res) => {
  try {
    const uid = req.user.id;
    const xp = await computeBaselineXp(dbGet, uid);
    await dbRun(
      `INSERT INTO user_preferences (user_id, xp_total)
       VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET xp_total = EXCLUDED.xp_total`,
      [uid, xp],
    );
    res.json({
      xp,
      ...xpProgressForTotal(xp),
      xpPerLevel: xpProgressForTotal(xp).next,
      xpInLevel: xpProgressForTotal(xp).current,
      multiplier: scaledXpReward('checkup', levelFromXp(xp)) / XP_REWARDS.checkup,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load progress.' });
  }
});

/** POST /api/me/progress/award — { reason: checkup | saveData | aiReport | goalCreated | onboarding } */
router.post('/progress/award', async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!XP_REWARDS[reason]) return res.status(400).json({ error: 'Invalid progress reason.' });

    const uid = req.user.id;
    const current = await computeBaselineXp(dbGet, uid);
    const startLevel = levelFromXp(current);
    const amount = scaledXpReward(reason, startLevel);
    let next = current + amount;
    const endLevel = levelFromXp(next);
    if (endLevel > startLevel) {
      for (let l = startLevel + 1; l <= endLevel; l += 1) {
        next += levelUpBonus(l);
      }
    }
    await dbRun(
      `INSERT INTO user_preferences (user_id, xp_total)
       VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET xp_total = ?`,
      [uid, next, next],
    );
    const progress = xpProgressForTotal(next);
    res.json({
      xp: next,
      ...progress,
      xpPerLevel: progress.next,
      xpInLevel: progress.current,
      awarded: amount,
      multiplier: scaledXpReward(reason, startLevel) / (XP_REWARDS[reason] || 1),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not award progress.' });
  }
});

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
    const aiReports = await dbAll(
      `SELECT id, area, month, dimension_score, dimension_grade, created_at
       FROM ai_report_log WHERE user_id = ? ORDER BY area, created_at DESC LIMIT 500`,
      [uid],
    );
    const prefs = await dbGet(
      'SELECT digest_enabled, digest_channel, digest_email, digest_weekday, terms_accepted_at FROM user_preferences WHERE user_id = ?',
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
      aiReportLog: aiReports.map((r) => ({
        id: r.id,
        area: r.area,
        month: r.month,
        dimensionScore: r.dimension_score,
        dimensionGrade: r.dimension_grade,
        createdAt: r.created_at,
      })),
      goals,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed.' });
  }
});

/** GET /api/me/onboarding */
router.get('/onboarding', async (req, res) => {
  try {
    const prefs = await dbGet(
      'SELECT onboarding_complete, primary_goal FROM user_preferences WHERE user_id = ?',
      [req.user.id],
    );
    const history = await dbGet(
      'SELECT id FROM checkup_history WHERE user_id = ? LIMIT 1',
      [req.user.id],
    );
    res.json({
      complete: Boolean(prefs?.onboarding_complete) || Boolean(history),
      primaryGoal: prefs?.primary_goal || '',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load onboarding status.' });
  }
});

/** PATCH /api/me/onboarding */
router.patch('/onboarding', async (req, res) => {
  try {
    const { complete, primaryGoal } = req.body || {};
    const existing = await dbGet(
      'SELECT onboarding_complete, primary_goal FROM user_preferences WHERE user_id = ?',
      [req.user.id],
    );
    const nextComplete = complete !== undefined ? (complete ? 1 : 0) : (existing?.onboarding_complete ?? 0);
    const nextGoal = primaryGoal !== undefined ? String(primaryGoal) : (existing?.primary_goal ?? null);
    await dbRun(
      `INSERT INTO user_preferences (user_id, onboarding_complete, primary_goal)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         onboarding_complete = EXCLUDED.onboarding_complete,
         primary_goal = EXCLUDED.primary_goal`,
      [req.user.id, nextComplete, nextGoal],
    );
    res.json({ ok: true, complete: Boolean(nextComplete), primaryGoal: nextGoal || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save onboarding.' });
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

    await cancelStripeBillingForUser(req.user.id);
    await dbRun('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ ok: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

module.exports = router;
