import { goalLabel, strategyForArea } from './goalResources';

function dimScore(checkupResult, key) {
  const d = checkupResult?.dimensions?.find((x) => x.key === key);
  return d ? Math.round(d.score) : null;
}

function dimSummary(checkupResult, key) {
  return checkupResult?.dimensions?.find((x) => x.key === key)?.summary || null;
}

export function assessPrimaryGoalProgress(primaryGoal, { checkupResult, profileSummary, income, totalExpenses, savingsRate }) {
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const summary = profileSummary || {};
  const goal = primaryGoal || 'general';

  const base = {
    goalId: goal,
    label: goalLabel(goal),
    progressPercent: 0,
    status: 'needs_attention',
    statusLabel: 'Getting started',
    headline: 'Add your financial data on Finances to measure progress toward your goal.',
    metrics: [],
    focusScores: [],
  };

  if (!checkupResult?.dimensions?.length && !inc && !exp) {
    return base;
  }

  switch (goal) {
    case 'emergency_fund': {
      const target = exp > 0 ? exp * 3 : inc > 0 ? inc : 0;
      const current = summary.emergencyFund || 0;
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : dimScore(checkupResult, 'savings') ?? 0;
      const months = exp > 0 ? current / exp : 0;
      return {
        ...base,
        progressPercent: progress,
        status: progress >= 100 ? 'on_track' : progress >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: progress >= 100 ? 'On track' : progress >= 50 ? 'In progress' : 'Needs attention',
        headline:
          target > 0
            ? `Emergency fund covers ${months.toFixed(1)} of ${3} target months (${Math.round(progress)}% of 3-month goal).`
            : dimSummary(checkupResult, 'savings') || 'Build toward 3–6 months of essential expenses.',
        metrics: [
          { label: 'Saved', value: `$${Number(current).toLocaleString()}`, detail: 'Current emergency fund' },
          { label: 'Target', value: target > 0 ? `$${Math.round(target).toLocaleString()}` : '—', detail: '3 months of expenses' },
          { label: 'Savings score', value: dimScore(checkupResult, 'savings') ?? '—', detail: 'Checkup dimension' },
        ],
        focusScores: [{ key: 'savings', label: 'Savings', score: dimScore(checkupResult, 'savings') }],
      };
    }
    case 'debt_free': {
      const debt = summary.totalDebt || 0;
      const debtScore = dimScore(checkupResult, 'debt') ?? (debt <= 0 ? 100 : 0);
      const progress = debt <= 0 ? 100 : debtScore;
      return {
        ...base,
        progressPercent: progress,
        status: debt <= 0 ? 'on_track' : progress >= 70 ? 'in_progress' : 'needs_attention',
        statusLabel: debt <= 0 ? 'Debt free' : progress >= 70 ? 'In progress' : 'Needs attention',
        headline:
          debt <= 0
            ? 'No debt balances on file — keep it that way or update Finances if you carry balances.'
            : dimSummary(checkupResult, 'debt') || `$${Number(debt).toLocaleString()} total debt — focus on highest-rate payoff first.`,
        metrics: [
          { label: 'Total debt', value: `$${Number(debt).toLocaleString()}`, detail: 'From profile' },
          { label: 'Debt score', value: dimScore(checkupResult, 'debt') ?? '—', detail: 'Checkup dimension' },
          { label: 'Surplus', value: `$${Math.max(0, inc - exp).toLocaleString()}`, detail: 'Room for extra payments' },
        ],
        focusScores: [{ key: 'debt', label: 'Debt', score: dimScore(checkupResult, 'debt') }],
      };
    }
    case 'wealth_building': {
      const scores = ['savings', 'investments', 'retirement'].map((k) => dimScore(checkupResult, k)).filter((s) => s != null);
      const progress = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : savingsRate || 0;
      const strat = strategyForArea('savings', goal);
      return {
        ...base,
        progressPercent: Math.min(100, progress),
        status: progress >= 75 ? 'on_track' : progress >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: progress >= 75 ? 'On track' : progress >= 50 ? 'In progress' : 'Needs attention',
        headline: strat?.focus || 'Wealth building needs consistent savings, investing, and retirement contributions.',
        metrics: [
          { label: 'Savings rate', value: `${Number(savingsRate || 0).toFixed(1)}%`, detail: 'Of income this month' },
          { label: 'Investments', value: `$${Number(summary.investmentTotal || 0).toLocaleString()}`, detail: 'Portfolio total' },
          { label: 'Retirement', value: `$${Number(summary.retirementBalance || 0).toLocaleString()}`, detail: 'Accounts saved' },
        ],
        focusScores: ['savings', 'investments', 'retirement'].map((k) => ({
          key: k,
          label: k.charAt(0).toUpperCase() + k.slice(1),
          score: dimScore(checkupResult, k),
        })),
      };
    }
    case 'retirement': {
      const score = dimScore(checkupResult, 'retirement') ?? 0;
      const gap = checkupResult?.retirementTrajectory?.monthlyGap;
      return {
        ...base,
        progressPercent: score,
        status: score >= 75 ? 'on_track' : score >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: score >= 75 ? 'On track' : score >= 50 ? 'In progress' : 'Needs attention',
        headline:
          checkupResult?.retirementTrajectory?.summary ||
          dimSummary(checkupResult, 'retirement') ||
          'Increase retirement contributions to close your long-term gap.',
        metrics: [
          { label: 'Saved', value: `$${Number(summary.retirementBalance || 0).toLocaleString()}`, detail: '401(k)/IRA balance' },
          { label: 'Score', value: score || '—', detail: 'Retirement dimension' },
          { label: 'Gap', value: gap ? `+$${Number(gap).toLocaleString()}/mo` : '—', detail: 'Suggested catch-up' },
        ],
        focusScores: [{ key: 'retirement', label: 'Retirement', score: score }],
      };
    }
    case 'invest': {
      const score = dimScore(checkupResult, 'investments') ?? 0;
      return {
        ...base,
        progressPercent: score,
        status: score >= 75 ? 'on_track' : score >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: score >= 75 ? 'On track' : score >= 50 ? 'In progress' : 'Needs attention',
        headline:
          dimSummary(checkupResult, 'investments') ||
          checkupResult?.investmentHealth?.summary ||
          'Diversify allocation and keep fees low for long-term growth.',
        metrics: [
          { label: 'Portfolio', value: `$${Number(summary.investmentTotal || 0).toLocaleString()}`, detail: 'Total invested' },
          { label: 'Score', value: score || '—', detail: 'Investments dimension' },
          { label: 'Surplus', value: `$${Math.max(0, inc - exp).toLocaleString()}`, detail: 'Available to invest' },
        ],
        focusScores: [{ key: 'investments', label: 'Investments', score: score }],
      };
    }
    case 'insurance': {
      const score = dimScore(checkupResult, 'insurance') ?? 0;
      const covered = summary.insuranceCount ?? 0;
      const progress = score || (covered / 3) * 100;
      return {
        ...base,
        progressPercent: Math.min(100, progress),
        status: covered >= 3 && score >= 75 ? 'on_track' : progress >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: covered >= 3 ? 'Well covered' : progress >= 50 ? 'In progress' : 'Gaps remain',
        headline:
          dimSummary(checkupResult, 'insurance') ||
          `${covered}/3 coverage types on file — life, disability, and liability protect your plan.`,
        metrics: [
          { label: 'Coverage', value: `${covered}/3 types`, detail: 'Life · disability · liability' },
          { label: 'Score', value: score || '—', detail: 'Insurance dimension' },
          { label: 'Income', value: `$${inc.toLocaleString()}`, detail: 'Basis for coverage needs' },
        ],
        focusScores: [{ key: 'insurance', label: 'Insurance', score: score }],
      };
    }
    default: {
      const overall = Math.round(checkupResult?.overallScore ?? 0);
      return {
        ...base,
        label: goalLabel(''),
        progressPercent: overall,
        status: overall >= 75 ? 'on_track' : overall >= 50 ? 'in_progress' : 'needs_attention',
        statusLabel: overall >= 75 ? 'On track' : overall >= 50 ? 'In progress' : 'Needs attention',
        headline: checkupResult?.headline || 'Complete your profile to track progress toward financial wellness.',
        metrics: [
          { label: 'Overall score', value: overall || '—', detail: 'Financial checkup' },
          { label: 'Savings rate', value: `${Number(savingsRate || 0).toFixed(1)}%`, detail: 'This month' },
          { label: 'Surplus', value: `$${Math.max(0, inc - exp).toLocaleString()}`, detail: 'Income minus expenses' },
        ],
        focusScores: (checkupResult?.dimensions || []).slice(0, 3).map((d) => ({
          key: d.key,
          label: d.label,
          score: Math.round(d.score),
        })),
      };
    }
  }
}

export function statusColor(status) {
  if (status === 'on_track') return '#86efac';
  if (status === 'in_progress') return '#fbbf24';
  return '#fca5a5';
}
