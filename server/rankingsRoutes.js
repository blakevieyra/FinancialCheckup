const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbAll, dbGet } = require('./db');
const { healthScore } = require('./scoring');

router.use(verifyToken);

function maskName(username, userId, viewerId, mask) {
  if (!mask || userId === viewerId) return username;
  const s = String(username || 'user');
  if (s.length <= 2) return `${s[0]}••`;
  return `${s.slice(0, 2)}••`;
}

/**
 * GET /api/rankings/leaderboard?month=YYYY-MM&limit=30&mask=1
 * mask=1 hides other usernames (first two chars + bullets).
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 30));
    const mask = String(req.query.mask || '') === '1' || String(req.query.mask || '').toLowerCase() === 'true';

    const users = await dbAll('SELECT id, username FROM users ORDER BY id ASC');
    const rows = [];
    for (const u of users) {
      const incRow = await dbGet(
        'SELECT amount FROM income WHERE user_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
        [u.id, month],
      );
      const expenseRow = await dbGet(
        'SELECT COALESCE(SUM(amount), 0) AS t FROM expenses WHERE user_id = ? AND month = ?',
        [u.id, month],
      );
      const income = Number(incRow?.amount ?? 0);
      const totalExpenses = Number(expenseRow?.t ?? 0);
      const hs = healthScore(income, totalExpenses);

      rows.push({
        userId: u.id,
        username: maskName(u.username, u.id, req.user.id, mask),
        rawUsername: u.username,
        income,
        totalExpenses,
        balance: Number((income - totalExpenses).toFixed(2)),
        expenseRatio: hs.expenseRatio != null ? Number(hs.expenseRatio.toFixed(2)) : null,
        grade: hs.grade,
        healthScore: Number(hs.score.toFixed(2)),
        eligible: hs.eligible,
      });
    }

    const eligible = rows.filter((r) => r.eligible);
    const ineligible = rows.filter((r) => !r.eligible);

    eligible.sort((a, b) => {
      if (b.healthScore !== a.healthScore) return b.healthScore - a.healthScore;
      if (b.balance !== a.balance) return b.balance - a.balance;
      if (a.totalExpenses !== b.totalExpenses) return a.totalExpenses - b.totalExpenses;
      return String(a.rawUsername || '').localeCompare(String(b.rawUsername || ''));
    });

    ineligible.sort((a, b) => String(a.rawUsername || '').localeCompare(String(b.rawUsername || '')));

    const ranked = [...eligible.map((r, idx) => ({ ...r, rank: idx + 1 })), ...ineligible.map((r) => ({ ...r, rank: null }))];

    /** Null rank displayed as NR (not comparable without income). */
    const withDisplayRank = ranked.map((r) => ({
      rank: r.rank,
      rankLabel: r.rank != null ? String(r.rank) : 'NR',
      userId: r.userId,
      username: r.username,
      healthScore: r.healthScore,
      expenseRatio: r.expenseRatio,
      grade: r.grade,
      balance: r.balance,
      income: r.income,
      totalExpenses: r.totalExpenses,
      eligible: r.eligible,
      isYou: r.userId === req.user.id,
    }));

    const yours = withDisplayRank.find((r) => r.isYou);
    const leaderboard = withDisplayRank
      .filter((r) => r.eligible && r.rank != null && r.rank <= limit)
      .map((r) => ({
        rank: r.rank,
        rankLabel: r.rankLabel,
        username: r.username,
        healthScore: r.healthScore,
        expenseRatio: r.expenseRatio,
        grade: r.grade,
        surplus: r.balance,
        eligible: r.eligible,
        isYou: r.isYou,
      }));

    const youInTop = yours?.eligible && yours.rank != null && yours.rank <= limit;

    res.json({
      month,
      metric: 'health_score',
      description:
        'Health score = 100 − expense ratio (%), clipped to 0–100 when income > 0. Higher is better. Users without income for this month are not ranked (NR).',
      totalUsers: rows.length,
      totalRanked: eligible.length,
      yourRank: yours?.rank ?? null,
      yourRankLabel: yours?.rank != null ? String(yours.rank) : yours?.eligible === false ? 'NR' : '—',
      yourHealthScore: yours?.healthScore ?? 0,
      yourExpenseRatio: yours?.expenseRatio,
      yourGrade: yours?.grade ?? 'N/A',
      maskActive: mask,
      leaderboard,
      youInTopSlice: youInTop,
      /** Full snapshot for the signed-in user (not shown for other accounts). */
      you: yours
        ? {
            rank: yours.rank,
            rankLabel: yours.rankLabel,
            healthScore: yours.healthScore,
            expenseRatio: yours.expenseRatio,
            grade: yours.grade,
            balance: yours.balance,
            income: yours.income,
            totalExpenses: yours.totalExpenses,
            eligible: yours.eligible,
          }
        : null,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
