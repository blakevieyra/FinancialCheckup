const router = require('express').Router();
const { isProd } = require('./safeError');
const { verifyToken } = require('./auth');
const { createMessage, parseJsonFromText } = require('./anthropicClient');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { buildMacroContextLine } = require('./fredContext');
const { requireFeature } = require('./requireFeature');
const { saveAiReport } = require('./aiReportLog');

router.use(verifyToken);

/**
 * POST /api/expert/briefing
 * { "month": "YYYY-MM", "profile": "personal" | "business" | "organizational" }
 * Returns expert-style structured JSON recommendations.
 */
router.post('/briefing', requireFeature('expertBriefing'), async (req, res) => {
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
    snap = await snapshotForUserMonth(req.user.id, month);
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
  "headline": "string under 80 chars — specific numbers if deficit or critical ratio",
  "executiveVerdict": "3-4 sentences: cash flow reality, biggest structural risk, what must change first",
  "personalizedPriorities": ["5 ordered, specific actionable strings tied to user's expense lines"],
  "benchmarkContext": "2-3 sentences comparing expense ratio and top categories to common rules (50/30/20, housing under 28-30%, emergency fund months)",
  "riskWatchouts": ["4-5 short strings — debt spiral, concentration, liquidity, income fragility"],
  "disclaimer": "One sentence: educational only, not personalized investment/legal/tax advice."
}`;

  const system =
    'You output strict JSON only. Keep language executive and specific to the user\'s categories.';

  try {
    const system =
      'You output strict JSON only. Keep language executive and specific to the user\'s categories. No trailing commas.';
    let parsed;
    try {
      const raw = await createMessage({ userContent, maxTokens: 2500, system });
      parsed = parseJsonFromText(raw);
    } catch (parseErr) {
      console.warn('Expert briefing JSON retry:', parseErr.message);
      const raw2 = await createMessage({
        userContent: `${userContent}\n\nIMPORTANT: Return ONLY valid JSON. Shorter strings, max 4 priorities.`,
        maxTokens: 2500,
        system,
      });
      parsed = parseJsonFromText(raw2);
    }

    const expert = {
      headline: parsed.headline,
      executiveVerdict: parsed.executiveVerdict,
      personalizedPriorities: parsed.personalizedPriorities || [],
      benchmarkContext: parsed.benchmarkContext,
      riskWatchouts: parsed.riskWatchouts || [],
      disclaimer: parsed.disclaimer,
    };

    let reportId = null;
    try {
      reportId = await saveAiReport(req.user.id, {
        area: 'expert',
        month,
        dimensionScore: snap.expenseRatio,
        dimensionGrade: snap.grade,
        report: { month, profile, summary: parsed.headline, expert },
      });
    } catch (logErr) {
      console.warn('Expert report log save failed:', logErr.message);
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
      expert,
      macroUsed: Boolean(macroLine),
      reportId,
    });
  } catch (e) {
    console.error('Expert briefing error:', e.message);
    const status = /ANTHROPIC_API_KEY|not set/i.test(e.message) ? 400 : 502;
    res.status(status).json({
      error: isProd ? 'Expert briefing failed. Please try again.' : e.message || 'Expert briefing failed.',
    });
  }
});

module.exports = router;
