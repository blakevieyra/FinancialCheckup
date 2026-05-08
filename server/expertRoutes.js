const router = require('express').Router();
const { verifyToken } = require('./auth');
const { createMessage, stripJsonFence } = require('./anthropicClient');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { buildMacroContextLine } = require('./fredContext');

router.use(verifyToken);

/**
 * POST /api/expert/briefing
 * { "month": "YYYY-MM", "profile": "personal" | "business" | "organizational" }
 * Returns expert-style structured JSON recommendations.
 */
router.post('/briefing', async (req, res) => {
  const month = req.body?.month || new Date().toISOString().slice(0, 7);
  const profile = req.body?.profile || 'personal';
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month must be YYYY-MM.' });
  }
  if (!['personal', 'business', 'organizational'].includes(profile)) {
    return res.status(400).json({ error: 'profile must be personal, business, or organizational.' });
  }

  let snap;
  try {
    snap = snapshotForUserMonth(req.user.id, month);
  } catch (e) {
    return res.status(500).json({ error: 'Could not load ledger data.' });
  }

  const macroLine = await buildMacroContextLine();

  const persona =
    profile === 'business'
      ? 'You are a senior fractional CFO / small-business finance advisor.'
      : profile === 'organizational'
        ? 'You are a nonprofit / corporate budget officer who focuses on sustainability and accountability.'
        : 'You are a CFP-style personal finance coach (educational only, not a licensed advisor relationship).';

  const focus =
    profile === 'business'
      ? 'Emphasize cash runway, operating leverage, margin risk, and working capital.'
      : profile === 'organizational'
        ? 'Emphasize program vs admin cost balance, reserves, and realistic forecasting.'
        : 'Emphasize emergency fund, debt payoff order, housing/income ratio guardrails, and savings rate.';

  const topExp = [...snap.expenses]
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const userContent = `${persona} ${focus}

Month: ${month}
Income: $${snap.income.toLocaleString()}
Total expenses: $${snap.totalExpenses.toLocaleString()}
Balance: $${snap.balance.toLocaleString()}
Expense ratio: ${snap.expenseRatio.toFixed(1)}%
App grade (heuristic): ${snap.grade}

Expense lines:
${topExp.map((e) => `- ${e.category}: $${Number(e.amount).toLocaleString()}`).join('\n')}

Deterministic app tips (respect these facts; you may refine):
${snap.deterministicTips.map((t) => `- ${t}`).join('\n')}

${macroLine ? `Macro context (optional): ${macroLine}` : ''}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "headline": "string under 80 chars",
  "executiveVerdict": "2-3 sentences",
  "personalizedPriorities": ["max 5 actionable strings"],
  "benchmarkContext": "1-2 sentences comparing to common rules of thumb for this profile",
  "riskWatchouts": ["max 4 short strings"],
  "disclaimer": "One sentence: educational only, not personalized investment/legal/tax advice."
}`;

  const system =
    'You output strict JSON only. Keep language executive and specific to the user\'s categories.';

  try {
    const raw = await createMessage({ userContent, maxTokens: 2500, system });
    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch {
      return res.status(502).json({ error: 'Expert model returned invalid JSON.' });
    }

    res.json({
      month,
      profile,
      snapshot: {
        income: snap.income,
        totalExpenses: snap.totalExpenses,
        balance: snap.balance,
        expenseRatio: snap.expenseRatio,
        grade: snap.grade,
      },
      deterministicTips: snap.deterministicTips,
      expert: {
        headline: parsed.headline,
        executiveVerdict: parsed.executiveVerdict,
        personalizedPriorities: parsed.personalizedPriorities || [],
        benchmarkContext: parsed.benchmarkContext,
        riskWatchouts: parsed.riskWatchouts || [],
        disclaimer: parsed.disclaimer,
      },
      macroUsed: Boolean(macroLine),
    });
  } catch (e) {
    console.error('Expert briefing error:', e.message);
    const status = /ANTHROPIC_API_KEY|not set/i.test(e.message) ? 400 : 502;
    res.status(status).json({ error: e.message || 'Expert briefing failed.' });
  }
});

module.exports = router;
