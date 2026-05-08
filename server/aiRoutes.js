const router = require('express').Router();
const { verifyToken } = require('./auth');
const { createMessage, stripJsonFence } = require('./anthropicClient');

router.use(verifyToken);

router.post('/insights', async (req, res) => {
  const { income, expenses, totalExpenses, grade, expenseRatio, month, profile } = req.body;
  if (income === undefined || !Array.isArray(expenses)) {
    return res.status(400).json({ error: 'Missing financial data.' });
  }

  const safeMonth = month || new Date().toISOString().slice(0, 7);
  const safeProfile = profile || 'personal'; // 'personal' | 'business' | 'organizational'

  const profileInstruction =
    safeProfile === 'business'
      ? 'You are a concise small-business finance advisor.'
      : safeProfile === 'organizational'
        ? 'You are a concise organizational (nonprofit/corporate) budgeting advisor.'
        : 'You are a concise personal finance advisor.';

  const promptFocus =
    safeProfile === 'business'
      ? 'Focus on cashflow stability, operating cost control, and runway.'
      : safeProfile === 'organizational'
        ? 'Focus on budget allocation, departmental efficiency, and sustainability.'
        : 'Focus on personal spending habits, priorities, and saving opportunities.';

  const prompt = `${profileInstruction} Analyze this budget for ${safeMonth}:

${promptFocus}

Income: $${Number(income).toLocaleString()}
Total Expenses: $${Number(totalExpenses).toLocaleString()}
Expense Ratio: ${Number(expenseRatio).toFixed(1)}%
Budget Grade: ${grade}

Top expenses:
${expenses.slice(0, 8).map((e) => `  ${e.category}: $${Number(e.amount).toLocaleString()}`).join('\n')}

Give exactly 5 specific, actionable insights. Return ONLY a JSON array with no markdown:
[{"type":"warning"|"success"|"tip"|"alert","title":"max 6 words","message":"1-2 sentences max"}]`;

  try {
    const text = await createMessage({ userContent: prompt, maxTokens: 1024 });
    let insights;
    try {
      insights = JSON.parse(stripJsonFence(text) || '[]');
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON.' });
    }

    res.json({ insights });
  } catch (err) {
    console.error('AI error:', err.message);
    const msg = err.message || 'Failed to generate insights.';
    const status = /ANTHROPIC_API_KEY|not set/i.test(msg) ? 400 : msg.includes('Anthropic API') ? 502 : 500;
    res.status(status).json({ error: msg });
  }
});

module.exports = router;
