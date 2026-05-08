const jsonHeaders = { 'Content-Type': 'application/json' };

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
  const init = { method, headers };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) init.body = JSON.stringify(body);

  const url = apiUrl(path);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
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

export async function register(username, password) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });
}

export async function login(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function getIncome(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/income?month=${m}`, { token });
}

export async function setIncome(token, { amount, month }) {
  return apiFetch('/api/income', {
    method: 'POST',
    token,
    body: { amount, month },
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

export async function downloadMonthlyCsv(token, month) {
  const m = encodeURIComponent(month);
  const res = await fetch(apiUrl(`/api/reports/csv?month=${m}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function downloadExecutivePdf(token, month) {
  const m = encodeURIComponent(month);
  const res = await fetch(apiUrl(`/api/reports/executive-pdf?month=${m}`), {
    headers: { Authorization: `Bearer ${token}` },
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

export async function getFinancialAdvice(token, month) {
  const m = encodeURIComponent(month);
  return apiFetch(`/api/me/financial-advice?month=${m}`, { token });
}

