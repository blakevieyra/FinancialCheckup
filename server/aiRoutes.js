const router = require('express').Router();
const { verifyToken } = require('./auth');
const { createMessage, parseJsonFromText } = require('./anthropicClient');
const { requireFeature } = require('./requireFeature');
const { sendAiInsightsEmail, sendSpecialistReportEmail } = require('./transactionalEmail');

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
    const system = 'You respond with a single valid JSON object only. No markdown fences, no commentary before or after.';
    let parsed;
    try {
      const text = await createMessage({ userContent: prompt, maxTokens: 8192, system });
      parsed = parseJsonFromText(text);
    } catch (parseErr) {
      console.warn('AI insights JSON retry:', parseErr.message);
      const retryPrompt = `${prompt}\n\nIMPORTANT: Your previous reply was not valid JSON. Return ONLY the JSON object, nothing else. Keep categoryPlans to 6 items with shorter optimizedPlan arrays (2 steps each).`;
      const text2 = await createMessage({ userContent: retryPrompt, maxTokens: 8192, system });
      parsed = parseJsonFromText(text2);
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

const SPECIALIST_PROMPTS = {
  insurance: 'You are an insurance planning educator. Analyze life, disability, and liability coverage gaps.',
  investments: 'You are an investment educator (not a broker). Analyze portfolio allocation, fees, diversification, and age-appropriate targets.',
  savings: 'You are a savings and emergency fund coach. Analyze emergency fund target vs balance, savings rate, and automation strategies.',
  budget: 'You are a budgeting coach. Analyze expense ratio, category concentration, and realistic cuts to improve cash flow.',
  debt: 'You are a debt payoff strategist. Compare avalanche vs snowball, interest savings, and realistic extra payment plans.',
  retirement: 'You are a retirement planning educator. Analyze savings rate, contribution gaps, and trajectory vs age benchmarks.',
};

router.post('/specialist', requireFeature('aiInsights'), async (req, res) => {
  const area = req.body?.area;
  if (!['insurance', 'investments', 'savings', 'budget', 'debt', 'retirement'].includes(area)) {
    return res.status(400).json({ error: 'area must be insurance, investments, savings, budget, debt, or retirement.' });
  }

  const {
    month,
    profile,
    primaryGoal,
    income,
    totalExpenses,
    dimensionScore,
    dimensionGrade,
    snapshot = {},
    gaps = [],
    summary: existingSummary,
  } = req.body;

  const safeMonth = month || new Date().toISOString().slice(0, 7);
  const persona = SPECIALIST_PROMPTS[area];
  const goalLine = primaryGoal ? `User primary goal: ${primaryGoal}.` : 'User primary goal: general financial wellness.';

  const prompt = `${persona} Educational only — not licensed advice.

${goalLine}
Month: ${safeMonth}
Profile: ${profile || 'personal'}
Income: $${Number(income || 0).toLocaleString()} · Expenses: $${Number(totalExpenses || 0).toLocaleString()}
${area} dimension score: ${dimensionScore != null ? Math.round(dimensionScore) : 'unknown'}/100 (${dimensionGrade || 'N/A'})

SNAPSHOT
${JSON.stringify(snapshot, null, 2)}

GAPS / CONTEXT
${gaps.length ? gaps.map((g) => (typeof g === 'string' ? g : `${g.label || g.type}: ${g.estMonthlyCost ? `~$${g.estMonthlyCost}/mo` : g.summary || ''}`)).join('\n') : existingSummary || 'See snapshot.'}

${AUTHORITATIVE_SOURCES}

Return ONLY valid JSON:
{
  "summary": "2 sentence executive summary tailored to user goal",
  "report": "3-5 sentence detailed analysis paragraph",
  "advice": ["3-5 specific recommendations"],
  "nextSteps": ["3-5 ordered action steps for the next 30-90 days"],
  "sources": [{"title":"","url":"","why":""}],
  "disclaimer": "Educational only."
}`;

  try {
    const system = 'Return a single valid JSON object only. No markdown.';
    const text = await createMessage({ userContent: prompt, maxTokens: 2048, system });
    const parsed = parseJsonFromText(text);
    const result = {
      area,
      month: safeMonth,
      summary: parsed.summary || '',
      report: parsed.report || '',
      advice: Array.isArray(parsed.advice) ? parsed.advice : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      disclaimer: parsed.disclaimer || 'Educational only.',
    };
    const emailResult = await sendSpecialistReportEmail(req.user.id, {
      ...result,
      title: area.charAt(0).toUpperCase() + area.slice(1),
    }).catch(() => ({ sent: false }));
    res.json({ ...result, emailSent: Boolean(emailResult?.sent) });
  } catch (err) {
    console.error('AI specialist error:', err.message);
    res.status(502).json({ error: err.message || 'Specialist AI failed.' });
  }
});

router.post('/specialist/email', requireFeature('aiInsights'), async (req, res) => {
  const report = req.body?.report;
  if (!report || (!report.summary && !report.report)) {
    return res.status(400).json({ error: 'Missing report content.' });
  }
  try {
    const emailResult = await sendSpecialistReportEmail(req.user.id, report).catch(() => ({ sent: false }));
    res.json({ emailSent: Boolean(emailResult?.sent), reason: emailResult?.reason || null });
  } catch (err) {
    console.error('Specialist email error:', err.message);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

module.exports = router;
