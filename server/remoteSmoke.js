'use strict';

/**
 * Read-only smoke against a deployed API (no DATABASE_URL required).
 * Usage: API_BASE=https://financialcheckup-api.onrender.com node remoteSmoke.js
 */
const BASE = (process.env.API_BASE || 'https://financialcheckup-api.onrender.com').replace(/\/$/, '');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, body: data };
}

(async () => {
  try {
    let r = await req('GET', '/api/health');
    assert(r.status === 200 && r.body.status === 'ok', `health (${r.status})`);
    assert(r.body.db === 'ok', 'database should be ok');

    r = await req('GET', '/api/market/ticker');
    if (r.status === 200 && Array.isArray(r.body.items) && r.body.items.length > 0) {
      assert(r.body.items[0].price > 0, 'market price > 0');
    } else if (r.status === 502 || (r.status === 200 && r.body.unavailable)) {
      console.warn('WARN: market ticker unavailable (deploy latest API for Yahoo chart fix)');
    } else {
      assert(false, `market (${r.status})`);
    }

    r = await req('POST', '/api/checkup/preview', {
      income: 6200,
      expenses: [
        { category: 'Housing', amount: 1800 },
        { category: 'Groceries', amount: 400 },
      ],
      totalExpenses: 4200,
      extended: { emergencyFund: 3000, totalDebt: 12000 },
    });
    assert(r.status === 200 && r.body.ok === true, `checkup preview (${r.status})`);
    assert(r.body.overallScore != null, 'preview overallScore');
    assert(Array.isArray(r.body.dimensions) && r.body.dimensions.length === 6, 'preview 6 dimensions');

    r = await req('POST', '/api/auth/register', {
      username: 'x',
      password: 'short',
    });
    assert(r.status === 400, 'register rejects weak password');

    r = await req('POST', '/api/auth/register', {
      username: 'validuser_smoke',
      email: 'smoke@example.com',
      password: 'valid-password-12',
    });
    assert(
      r.status === 400 && (r.body.code === 'OTP_REQUIRED' || /terms/i.test(r.body.error || '')),
      `register requires OTP or terms (${r.status})`,
    );

    console.log(`Remote smoke OK — ${BASE}`);
  } catch (e) {
    console.error('Remote smoke FAILED:', e.message);
    process.exit(1);
  }
})();
