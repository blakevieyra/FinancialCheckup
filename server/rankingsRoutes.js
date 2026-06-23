const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbAll, dbGet } = require('./db');
const { computeBaselineXp, xpProgressForTotal } = require('./progression');

router.use(verifyToken);

function maskName(username, userId, viewerId, mask) {
  if (!mask || userId === viewerId) return username;
  const s = String(username || 'user');
  if (s.length <= 2) return `${s[0]}••`;
  return `${s.slice(0, 2)}••`;
}

/**
 * GET /api/rankings/leaderboard?limit=30&mask=1
 * Ranks users by level (desc), then total XP (desc). No financial data exposed.
 * `month` query param is accepted for backward compatibility but ignored.
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 30));
    const mask = String(req.query.mask || '') === '1' || String(req.query.mask || '').toLowerCase() === 'true';

    const users = await dbAll('SELECT id, username FROM users ORDER BY id ASC');
    const rows = [];
    for (const u of users) {
      const xp = await computeBaselineXp(dbGet, u.id);
      const progress = xpProgressForTotal(xp);
      rows.push({
        userId: u.id,
        username: maskName(u.username, u.id, req.user.id, mask),
        rawUsername: u.username,
        xp,
        level: progress.level,
        xpInLevel: progress.current,
        xpToNext: progress.next,
      });
    }

    rows.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return String(a.rawUsername || '').localeCompare(String(b.rawUsername || ''));
    });

    const withDisplayRank = rows.map((r, idx) => ({
      rank: idx + 1,
      rankLabel: String(idx + 1),
      userId: r.userId,
      username: r.username,
      xp: r.xp,
      level: r.level,
      xpInLevel: r.xpInLevel,
      xpToNext: r.xpToNext,
      isYou: r.userId === req.user.id,
    }));

    const yours = withDisplayRank.find((r) => r.isYou);
    const leaderboard = withDisplayRank
      .filter((r) => r.rank <= limit)
      .map((r) => ({
        rank: r.rank,
        rankLabel: r.rankLabel,
        username: r.username,
        level: r.level,
        xp: r.xp,
        isYou: r.isYou,
      }));

    const youInTop = yours?.rank != null && yours.rank <= limit;

    res.json({
      metric: 'xp_level',
      description: 'Ranked by level, then total XP earned from checkups, goals, and app activity. No financial amounts are shown.',
      totalUsers: rows.length,
      totalRanked: rows.length,
      yourRank: yours?.rank ?? null,
      yourRankLabel: yours?.rank != null ? String(yours.rank) : '—',
      yourLevel: yours?.level ?? 1,
      yourXp: yours?.xp ?? 0,
      maskActive: mask,
      leaderboard,
      youInTopSlice: youInTop,
      you: yours
        ? {
            rank: yours.rank,
            rankLabel: yours.rankLabel,
            level: yours.level,
            xp: yours.xp,
            xpInLevel: yours.xpInLevel,
            xpToNext: yours.xpToNext,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
