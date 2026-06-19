const DIM_META = {
  budget: {
    label: 'Budget',
    tab: 'finances',
    focus: 'Income & spending',
    tool: null,
  },
  debt: {
    label: 'Debt',
    tab: 'finances',
    focus: 'Debt balances & payments',
    tool: null,
  },
  savings: {
    label: 'Savings',
    tab: 'finances',
    focus: 'Emergency fund & monthly savings',
    tool: 'specialist-savings',
  },
  investments: {
    label: 'Investments',
    tab: 'finances',
    focus: 'Portfolio balance & allocation',
    tool: 'specialist-investments',
  },
  insurance: {
    label: 'Insurance',
    tab: 'finances',
    focus: 'Life, disability & liability coverage',
    tool: 'specialist-insurance',
  },
  retirement: {
    label: 'Retirement',
    tab: 'finances',
    focus: 'Retirement balance & contributions',
    tool: null,
  },
};

export function buildGuideSteps(checkupResult, primaryGoal = '') {
  if (!checkupResult?.dimensions?.length) {
    return [
      {
        id: 'start',
        title: 'Enter your financial data',
        detail: 'Add income, expenses, and profile details — your score updates automatically.',
        tab: 'finances',
        priority: 'HIGH',
        cta: 'Go to Finances',
      },
    ];
  }

  const excluded = new Set(checkupResult.excludedFromScore || []);
  const dims = [...checkupResult.dimensions]
    .filter((d) => !excluded.has(d.key))
    .sort((a, b) => a.score - b.score);

  const steps = [];
  const weakest = dims[0];
  if (weakest) {
    const meta = DIM_META[weakest.key] || { tab: 'finances', focus: weakest.label };
    steps.push({
      id: `fix-${weakest.key}`,
      title: `Strengthen ${meta.label || weakest.label}`,
      detail: `${weakest.summary || `Score ${Math.round(weakest.score)}/100 — focus on ${meta.focus}.`}`,
      tab: meta.tab,
      tool: meta.tool,
      dimension: weakest.key,
      score: weakest.score,
      priority: weakest.score < 55 ? 'HIGH' : 'MED',
      cta: meta.tool ? 'Open guidance in Finances' : 'Edit in Finances',
    });
  }

  const topAction = checkupResult.actionPlan?.[0];
  if (topAction) {
    steps.push({
      id: 'action-top',
      title: topAction.title,
      detail: topAction.detail || topAction.steps?.[0] || 'Your highest-impact next step.',
      tab: topAction.horizon === 'wealth' ? 'finances' : 'finances',
      tool: topAction.title?.toLowerCase().includes('invest') ? 'specialist-investments'
        : topAction.title?.toLowerCase().includes('insurance') ? 'specialist-insurance'
          : topAction.title?.toLowerCase().includes('saving') || topAction.title?.toLowerCase().includes('emergency')
            ? 'specialist-savings'
            : null,
      priority: topAction.priority || 'HIGH',
      cta: 'Take action',
    });
  }

  if (primaryGoal === 'debt_free' && dims.find((d) => d.key === 'debt' && d.score < 75)) {
    steps.push({
      id: 'goal-debt',
      title: 'Debt payoff plan',
      detail: 'Review avalanche vs snowball options in Finances and track progress monthly.',
      tab: 'finances',
      priority: 'HIGH',
      cta: 'Review debts',
    });
  }

  if (checkupResult.overallScore >= 70) {
    steps.push({
      id: 'progress',
      title: 'Track your momentum',
      detail: 'Review charts and goals on Progress to keep your score climbing.',
      tab: 'progress',
      priority: 'MED',
      cta: 'View Progress',
    });
  }

  if (!steps.find((s) => s.tool)) {
    steps.push({
      id: 'ai-plan',
      title: 'Get your AI action plan',
      detail: 'Generate a scored plan with sources for debt, savings, and investments.',
      tab: 'tools',
      tool: 'ai-insights',
      priority: 'MED',
      cta: 'Open Tools',
    });
  }

  return steps.slice(0, 4);
}
