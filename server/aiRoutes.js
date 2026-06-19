const router = require('express').Router();
const { verifyToken } = require('./auth');
const { createMessage, stripJsonFence } = require('./anthropicClient');
const { requireFeature } = require('./requireFeature');
const { sendAiInsightsEmail } = require('./transactionalEmail');

router.use(verifyToken);

const AUTHORITATIVE_SOURCES = `
Use only real, authoritative URLs when citing sources. Prefer:
- https://www.consumerfinance.gov/ (CFPB — budgeting, credit, debt)
- https://www.investor.gov/ (SEC — investing basics)
- https://www.irs.gov/ (tax & retirement accounts)
- https://www.annualcreditreport.com/ (credit reports)
- https://www.sba.gov/ (small business)
- https://www.usa.gov/money (general money guidance)
- https://www.ftc.gov/ (fraud & identity)
`;

router.post('/insights', requireFeature('aiInsights'), async (req, res) => {
  const {
    income,
    expenses,
    totalExpenses,
    grade,
    expenseRatio,
    month,
    profile,
    dimensions,
    overallScore,
    headline,
  } = req.body;

  if (income === undefined || !Array.isArray(expenses)) {
    return res.status(400).json({ error: 'Missing financial data.' });
  }

  const safeMonth = month || new Date().toISOString().slice(0, 7);
  const safeProfile = profile || 'personal';
  const dims = Array.isArray(dimensions) ? dimensions : [];

  const profileInstruction =
    safeProfile === 'business'
      ? 'You are a senior fractional CFO advising a small business.'
      : safeProfile === 'organizational'
        ? 'You are a nonprofit / organizational budget officer.'
        : 'You are a CFP-style personal finance coach (educational only).';

  const dimBlock = dims.length
    ? dims.map((d) => `- ${d.label || d.key}: score ${Math.round(d.score || 0)}/100, grade ${d.grade || 'N/A'}`).join('\n')
    : 'No checkup dimension scores provided — infer from ledger.';

  const prompt = `${profileInstruction}

Analyze ${safeProfile} finances for ${safeMonth} and produce a comprehensive optimized plan.

LEDGER
Income: $${Number(income).toLocaleString()}
Total expenses: $${Number(totalExpenses).toLocaleString()}
Expense ratio: ${Number(expenseRatio).toFixed(1)}%
Budget grade: ${grade}
Overall checkup score: ${overallScore != null ? Math.round(overallScore) : 'unknown'}
Headline: ${headline || 'N/A'}

CHECKUP DIMENSION SCORES (0-100)
${dimBlock}

TOP EXPENSE CATEGORIES
${expenses.slice(0, 12).map((e) => `  ${e.category}: $${Number(e.amount).toLocaleString()}`).join('\n')}

${AUTHORITATIVE_SOURCES}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "summary": "2-3 sentence executive summary of financial health and top priority",
  "insights": [
    {"type":"warning"|"success"|"tip"|"alert","title":"max 8 words","message":"1-2 sentences"}
  ],
  "categoryPlans": [
    {
      "key": "budget|debt|savings|investments|insurance|retirement",
      "label": "Budget|Debt|Savings|Investments|Insurance|Retirement",
      "score": number,
      "grade": "A-F",
      "status": "strong|watch|critical",
      "optimizedPlan": ["3-5 specific actionable steps tailored to this user's numbers"],
      "sources": [{"title":"short name","url":"https://...","why":"one sentence why this resource helps"}]
    }
  ],
  "specialistPlans": [
    {
      "area": "Debt management",
      "priority": "high|medium|low",
      "summary": "1-2 sentences",
      "plan": ["3-5 steps — avalanche/snowball, consolidation, negotiation as appropriate"],
      "sources": [{"title":"","url":"","why":""}]
    },
    {
      "area": "Investments & portfolio",
      "priority": "high|medium|low",
      "summary": "1-2 sentences",
      "plan": ["3-5 steps — diversification, fees, allocation, retirement accounts"],
      "sources": [{"title":"","url":"","why":""}]
    }
  ],
  "disclaimer": "Educational only — not personalized investment, tax, or legal advice."
}

Include exactly 6 categoryPlans (one per dimension). Give 2-3 real sources per category and specialist section. Prioritize lowest-scoring dimensions with more aggressive plans.`;

  try {
    const text = await createMessage({ userContent: prompt, maxTokens: 4096 });
    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(text));
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON.' });
    }

    const result = {
      summary: parsed.summary || '',
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      categoryPlans: Array.isArray(parsed.categoryPlans) ? parsed.categoryPlans : [],
      specialistPlans: Array.isArray(parsed.specialistPlans) ? parsed.specialistPlans : [],
      disclaimer: parsed.disclaimer || 'Educational only.',
      month: safeMonth,
    };

    const emailResult = await sendAiInsightsEmail(req.user.id, result).catch(() => ({ sent: false }));

    res.json({ ...result, emailSent: Boolean(emailResult?.sent) });
  } catch (err) {
    console.error('AI error:', err.message);
    const msg = err.message || 'Failed to generate insights.';
    const status = /ANTHROPIC_API_KEY|not set/i.test(msg) ? 400 : msg.includes('Anthropic API') ? 502 : 500;
    res.status(status).json({ error: msg });
  }
});

module.exports = router;
