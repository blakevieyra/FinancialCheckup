import * as api from './api';
import { saveExtendedProfile } from './userStorage';

export const ONBOARDING_PENDING_KEY = 'fc_onboarding_pending';

export function saveOnboardingPending(payload) {
  sessionStorage.setItem(ONBOARDING_PENDING_KEY, JSON.stringify(payload));
}

export function readOnboardingPending() {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearOnboardingPending() {
  sessionStorage.removeItem(ONBOARDING_PENDING_KEY);
}

export async function persistOnboardingData({
  token,
  userId,
  month,
  goal,
  data,
  emailSummary,
  summaryFreq,
  accountEmail,
}) {
  await api.setOnboarding(token, { primaryGoal: goal });
  await api.setIncome(token, { amount: Number(data.income) || 0, month });
  await api.updateExpenses(token, {
    month,
    expenses: [{ category: 'General', amount: Number(data.monthlyExpenses) || 0 }],
  });
  saveExtendedProfile(userId, {
    emergencyFund: data.emergencyFund,
    monthlySavings: data.monthlySavings,
    debts: data.debts,
    investmentTotal: data.investmentTotal,
    stockPct: data.stockPct,
    bondPct: data.bondPct,
    internationalPct: data.internationalPct,
    cashPct: data.cashPct,
    feePct: data.feePct,
    hasLifeInsurance: data.hasLifeInsurance,
    hasDisabilityInsurance: data.hasDisabilityInsurance,
    hasLiabilityInsurance: data.hasLiabilityInsurance,
    age: data.age,
    targetRetirementAge: data.targetRetirementAge,
    retirementBalance: data.retirementBalance,
    monthlyRetirementContribution: data.monthlyRetirementContribution,
    excludedFromScore: [],
  });
  if (emailSummary && accountEmail) {
    await api.updateDigestPrefs(token, {
      digestEnabled: true,
      digestChannel: 'email',
      digestEmail: accountEmail,
      digestFrequency: summaryFreq,
      digestWeekday: 1,
    });
  }
}

export async function finishOnboardingWithCheckup({
  token,
  userId,
  month,
  goal,
  data,
  emailSummary,
  summaryFreq,
  accountEmail,
}) {
  await persistOnboardingData({
    token,
    userId,
    month,
    goal,
    data,
    emailSummary,
    summaryFreq,
    accountEmail,
  });
  const snapshot = {
    ...data,
    income: Number(data.income) || 0,
    monthlyExpenses: Number(data.monthlyExpenses) || 0,
  };
  await api.runCheckup(token, { month, snapshot });
  await api.setOnboarding(token, { complete: true, primaryGoal: goal });
  clearOnboardingPending();
}
