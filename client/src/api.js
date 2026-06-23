const jsonHeaders = { 'Content-Type': 'application/json' };

/** Auth paths where a 401 is an expected user-input error (wrong creds), not a stale-session signal. */
const AUTH_PATH_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register/send-code',
  '/api/auth/register/resend-code',
  '/api/auth/register/verify',
  '/api/auth/forgot-password/send-code',
  '/api/auth/forgot-password/resend-code',
  '/api/auth/forgot-password/reset',
];

function isAuthPath(path) {
  return AUTH_PATH_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * Centralized stale-session cleanup.
 * Called when the API returns 401 on a token-bearing request — the JWT is either expired,
 * forged, or (most often after a database migration) signed for a user_id that no longer
 * exists. Wipe local credentials and notify the React tree via a custom event so App.jsx
 * can drop in-memory session state without a hard reload.
 */
function clearStaleSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('fc-user-id');
  } catch {
    /** Private-mode browsers can throw on localStorage; ignore — the in-memory state still resets. */
  }
  try {
    window.dispatchEvent(new CustomEvent('fc-unauthorized'));
  } catch {
    /** Older browsers that lack CustomEvent — fall back to a synthetic Event. */
    const ev = document.createEvent('Event');
    ev.initEvent('fc-unauthorized', false, false);
    window.dispatchEvent(ev);
  }
}

/** Production / split-host: set VITE_API_BASE_URL (no trailing slash), e.g. https://api.example.com */
function apiUrl(path) {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
      : '';
  if (path.startsWith('http')) return path;
  return `${base}${path}`;
}

async function apiFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { ...jsonHeaders };
  const init = { method, headers, credentials: 'include' };

  /** Legacy Bearer support (Capacitor / scripts). Web clients use httpOnly cookies. */
  if (token && typeof token === 'string' && token !== 'session') {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) init.body = JSON.stringify(body);

  const url = apiUrl(path);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    /** A 401 on a non-auth route means the session is dead — clear client state. */
    if (res.status === 401 && !isAuthPath(path)) {
      clearStaleSession();
    }
    const base = data?.error || data?.message || `Request failed (${res.status})`;
    const hint =
      res.status === 404
        ? ' Restart the API after updates and verify new routes exist (e.g. /api/reports/forecast, /api/me/financial-advice). Match VITE_PROXY_TARGET to your API port, or set VITE_API_BASE_URL for static hosting.'
        : '';
    throw new Error(base + hint);
  }
  return data;
}

export async function health() {
  return apiFetch('/api/health');
}

export async function getSession() {
  return apiFetch('/api/auth/session');
}

export async function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getMarketTicker() {
  return apiFetch('/api/market/ticker');
}

export async function sendSupportMessage(token, { subject, message, contactEmail }) {
  return apiFetch('/api/support', {
    method: 'POST',
    token,
    body: { subject, message, contactEmail },
  });
}

export async function changePassword(token, { currentPassword, newPassword }) {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword, newPassword },
  });
}

export async function register(username, password, email) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: { username, password, email },
  });
}

export async function sendRegisterCode(username, password, email, acceptedTerms = false) {
  return apiFetch('/api/auth/register/send-code', {
    method: 'POST',
    body: { username, password, email, acceptedTerms: Boolean(acceptedTerms) },
  });
}

export async function verifyRegister(email, code) {
  return apiFetch('/api/auth/register/verify', {
    method: 'POST',
    body: { email, code: String(code || '').replace(/\D/g, '') },
  });
}

export async function resendRegisterCode(email) {
  return apiFetch('/api/auth/register/resend-code', {
    method: 'POST',
    body: { email },
  });
}

export async function getProfile(token) {
  return apiFetch('/api/me/profile', { token });
}

export async function getProgress(token) {
  return apiFetch('/api/me/progress', { token });
}

export async function awardProgress(token, reason) {
  return apiFetch('/api/me/progress/award', { method: 'POST', token, body: { reason } });
}

export async function login(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function sendPasswordResetCode(email) {
  return apiFetch('/api/auth/forgot-password/send-code', {
    method: 'POST',
    body: { email },
  });
}

export async function resendPasswordResetCode(email) {
  return apiFetch('/api/auth/forgot-password/resend-code', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPasswordWithCode(email, code, newPassword) {
  return apiFetch('/api/auth/forgot-password/reset', {
    method: 'POST',
    body: { email, code: String(code || '').replace(/\D/g, ''), newPassword },
  });
}

export async function resendVerifyEmail(token) {
  return apiFetch('/api/auth/resend-verify', { method: 'POST', token, body: {} });
}

export async function getIncome(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/income?month=${m}`, { token });
}

export async function setIncome(token, { amount, month, sources }) {
  return apiFetch('/api/income', {
    method: 'POST',
    token,
    body: { amount, month, sources },
  });
}

export async function getExpenses(token, month, profile) {
  const m = encodeURIComponent(month);
  const p = profile ? `&profile=${encodeURIComponent(profile)}` : '';
  return apiFetch(`/api/expenses?month=${m}${p}`, { token });
}

export async function updateExpenses(token, { month, expenses }) {
  // Server expects: { month, expenses: [{ category, amount }, ...] }
  return apiFetch('/api/expenses', {
    method: 'PUT',
    token,
    body: { month, expenses },
  });
}

export async function getExpensesHistory(token) {
  return apiFetch('/api/expenses/history', { token });
}

export async function getIncomeHistory(token) {
  return apiFetch('/api/income/history', { token });
}

export async function getAiInsights(token, payload) {
  // payload: { income, expenses, totalExpenses, grade, expenseRatio, month, profile }
  return apiFetch('/api/ai/insights', { method: 'POST', token, body: payload });
}

export async function addExpenseCategory(token, { category, month }) {
  return apiFetch('/api/expenses/category', {
    method: 'POST',
    token,
    body: { category, month },
  });
}

export async function deleteExpenseCategory(token, { category, month }) {
  return apiFetch('/api/expenses/category', {
    method: 'DELETE',
    token,
    body: { category, month },
  });
}

export async function getDigestPrefs(token) {
  return apiFetch('/api/me/digest', { token });
}

export async function updateDigestPrefs(token, body) {
  return apiFetch('/api/me/digest', { method: 'PUT', token, body });
}

export async function sendDigestTest(token, body) {
  return apiFetch('/api/me/digest/test', { method: 'POST', token, body });
}

export async function downloadMonthlyCsv(_token, month) {
  const m = encodeURIComponent(month);
  const res = await fetch(apiUrl(`/api/reports/csv?month=${m}`), {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function downloadExecutivePdf(_token, month) {
  const m = encodeURIComponent(month);
  const res = await fetch(apiUrl(`/api/reports/executive-pdf?month=${m}`), {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function downloadBusinessDocsPdf(_token, month, months = 12) {
  const m = encodeURIComponent(month);
  const n = encodeURIComponent(months);
  const res = await fetch(apiUrl(`/api/reports/business-docs-pdf?month=${m}&months=${n}`), {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function getForecastOutcomes(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/reports/forecast?month=${m}`, { token });
}

export async function getBusinessDocs(token, month, months = 12) {
  const m = encodeURIComponent(month);
  const n = encodeURIComponent(months);
  return apiFetch(`/api/reports/business-docs?month=${m}&months=${n}`, { token });
}

export async function getCategoryAverages(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/reports/category-averages?month=${m}`, { token });
}

export function saveBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getExpertBriefing(token, body) {
  return apiFetch('/api/expert/briefing', { method: 'POST', token, body });
}

export async function getLeaderboard(token, month, { mask = false, limit } = {}) {
  const m = encodeURIComponent(month);
  const qs = [`month=${m}`];
  if (mask) qs.push('mask=1');
  if (limit != null) qs.push(`limit=${Number(limit)}`);
  return apiFetch(`/api/rankings/leaderboard?${qs.join('&')}`, { token });
}

export async function getMyTrends(token, months = 12) {
  return apiFetch(`/api/me/trends?months=${encodeURIComponent(months)}`, { token });
}

export async function exportMyData(token) {
  return apiFetch('/api/me/data-export', { token });
}

export async function deleteMyAccount(token, password) {
  return apiFetch('/api/me/account', { method: 'DELETE', token, body: { password } });
}

export async function getOnboarding(token) {
  return apiFetch('/api/me/onboarding', { token });
}

export async function setOnboarding(token, body) {
  return apiFetch('/api/me/onboarding', { method: 'PATCH', token, body });
}

export async function getSpecialistAdvice(token, payload) {
  return apiFetch('/api/ai/specialist', { method: 'POST', token, body: payload });
}

export async function getComprehensiveReport(token, payload) {
  return apiFetch('/api/ai/comprehensive', { method: 'POST', token, body: payload });
}

export async function emailSpecialistReport(token, report) {
  return apiFetch('/api/ai/specialist/email', { method: 'POST', token, body: { report } });
}

export async function listSpecialistReports(token, { area, month, limit } = {}) {
  const qs = new URLSearchParams();
  if (area) qs.set('area', area);
  if (month) qs.set('month', month);
  if (limit) qs.set('limit', String(limit));
  const q = qs.toString();
  return apiFetch(`/api/ai/specialist/history${q ? `?${q}` : ''}`, { token });
}

export async function getSpecialistReport(token, id) {
  return apiFetch(`/api/ai/specialist/history/${encodeURIComponent(id)}`, { token });
}

export async function deleteSpecialistReport(token, id) {
  return apiFetch(`/api/ai/specialist/history/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function getGoals(token) {
  return apiFetch('/api/goals', { token });
}

export async function createGoal(token, body) {
  return apiFetch('/api/goals', { method: 'POST', token, body });
}

export async function updateGoal(token, id, body) {
  return apiFetch(`/api/goals/${encodeURIComponent(id)}`, { method: 'PUT', token, body });
}

export async function deleteGoal(token, id) {
  return apiFetch(`/api/goals/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function previewCheckup(snapshot) {
  return apiFetch('/api/checkup/preview', { method: 'POST', body: { ...snapshot } });
}

export async function runCheckup(token, { month, snapshot }) {
  return apiFetch('/api/checkup/run', { method: 'POST', token, body: { month, snapshot } });
}

export async function getCheckupPrefill(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/checkup/prefill?month=${m}`, { token });
}

export async function getCheckupLatest(token, month) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiFetch(`/api/checkup/latest${qs}`, { token });
}

export async function getCheckupHistory(token, limit = 12) {
  return apiFetch(`/api/checkup/history?limit=${encodeURIComponent(limit)}`, { token });
}

export async function signupMoneyTips(token, email) {
  return apiFetch('/api/checkup/tips-signup', { method: 'POST', token, body: { email } });
}

export async function getSubscriptionStatus(token) {
  return apiFetch('/api/billing/status', { token });
}

export async function startStripeTrial(token) {
  return apiFetch('/api/billing/start-trial', { method: 'POST', token, body: {} });
}

/** @deprecated use startStripeTrial — kept for cached clients */
export async function startWelcomeTrial(token) {
  return apiFetch('/api/billing/welcome-trial', { method: 'POST', token, body: {} });
}

export async function createCheckoutSession(token, plan, options = {}) {
  return apiFetch('/api/billing/checkout', {
    method: 'POST',
    token,
    body: { plan, fromOnboarding: Boolean(options.fromOnboarding) },
  });
}

export async function createBillingPortalSession(token) {
  return apiFetch('/api/billing/portal', { method: 'POST', token, body: {} });
}

export async function syncSubscriptionStatus(token) {
  return apiFetch('/api/billing/sync', { method: 'POST', token, body: {} });
}

export function openExternalUrl(url) {
  if (!url) return;
  window.location.href = url;
}

