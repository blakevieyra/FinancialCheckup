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
    tab: 'tools',
    focus: 'Emergency fund & monthly savings',
    tool: 'specialist-savings',
  },
  investments: {
    label: 'Investments',
    tab: 'tools',
    focus: 'Portfolio balance & allocation',
    tool: 'specialist-investments',
  },
  insurance: {
    label: 'Insurance',
    tab: 'tools',
    focus: 'Life, disability & liability coverage',
    tool: 'specialist-insurance',
  },
  retirement: {
    label: 'Retirement',
    tab: 'tools',
    focus: 'Retirement balance & contributions',
    tool: 'specialist-retirement',
  },
};

function tabForActionTitle(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('invest') || lower.includes('insurance') || lower.includes('saving') || lower.includes('emergency')) {
    return 'tools';
  }
  return 'finances';
}

function toolForActionTitle(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('invest')) return 'specialist-investments';
  if (lower.includes('insurance')) return 'specialist-insurance';
  if (lower.includes('saving') || lower.includes('emergency')) return 'specialist-savings';
  return null;
}

function actionToGuideStep(action, idx) {
  return {
    id: idx === 0 ? 'action-top' : `action-${idx + 1}`,
    title: action.title,
    detail: action.detail || action.steps?.[0] || 'Ranked priority from your checkup.',
    tab: tabForActionTitle(action.title),
    tool: toolForActionTitle(action.title),
    priority: action.priority || (idx === 0 ? 'HIGH' : 'MED'),
    cta: 'Take action',
    isTopPriority: idx === 0,
    rank: idx === 0 ? undefined : idx + 1,
    timeline: action.timeline || null,
  };
}

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
  const rankedActions = (checkupResult.actionPlan || []).slice(0, 3);

  if (rankedActions.length) {
    rankedActions.forEach((action, idx) => steps.push(actionToGuideStep(action, idx)));
    return steps;
  }

  const weakest = dims[0];
  if (weakest) {
    const meta = DIM_META[weakest.key] || { tab: 'finances', focus: weakest.label };
    const fixTitle = `Strengthen ${meta.label || weakest.label}`;
    if (!steps.some((s) => s.title === fixTitle)) {
      steps.push({
        id: `fix-${weakest.key}`,
        title: fixTitle,
        detail: `${weakest.summary || `Score ${Math.round(weakest.score)}/100 — focus on ${meta.focus}.`}`,
        tab: meta.tab,
        tool: meta.tool,
        dimension: weakest.key,
        score: weakest.score,
        priority: weakest.score < 55 ? 'HIGH' : 'MED',
        cta: meta.tool ? 'Open AI report in Tools' : 'Edit in Finances',
      });
    }
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

  if (primaryGoal === 'wealth_building') {
    const weakWealth = dims.find((d) => (d.key === 'retirement' || d.key === 'investments' || d.key === 'savings') && d.score < 75);
    if (weakWealth) {
      steps.push({
        id: 'goal-wealth',
        title: 'Build long-term wealth',
        detail: `Strengthen ${weakWealth.label} first — savings, investments, and retirement compound over time.`,
        tab: 'tools',
        tool: weakWealth.key === 'investments' ? 'specialist-investments' : weakWealth.key === 'retirement' ? 'specialist-retirement' : 'specialist-savings',
        priority: 'HIGH',
        cta: 'Open in Tools',
      });
    }
  }

  if (primaryGoal === 'retirement' && dims.find((d) => d.key === 'retirement' && d.score < 75)) {
    steps.push({
      id: 'goal-retire',
      title: 'Close your retirement gap',
      detail: 'Increase contributions and review your target retirement age in Finances.',
      tab: 'tools',
      tool: 'specialist-retirement',
      priority: 'HIGH',
      cta: 'Open retirement report',
    });
  }

  if (primaryGoal === 'invest' && dims.find((d) => d.key === 'investments' && d.score < 75)) {
    steps.push({
      id: 'goal-invest',
      title: 'Improve portfolio allocation',
      detail: 'Review diversification, fees, and contribution rate for your investment goal.',
      tab: 'tools',
      tool: 'specialist-investments',
      priority: 'HIGH',
      cta: 'Open portfolio report',
    });
  }

  if (primaryGoal === 'emergency_fund' && dims.find((d) => d.key === 'savings' && d.score < 75)) {
    steps.push({
      id: 'goal-ef',
      title: 'Fund your emergency reserve',
      detail: 'Build toward 3–6 months of essential expenses — start with one month.',
      tab: 'tools',
      tool: 'specialist-savings',
      priority: 'HIGH',
      cta: 'Open savings report',
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

  return steps.slice(0, 3);
}
