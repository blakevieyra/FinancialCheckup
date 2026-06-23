'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { spawn } = require('child_process');
const { createTestClient } = require('./testHttp');

const PORT = 30100 + (process.pid % 500);

if (!process.env.DATABASE_URL) {
  console.log('Smoke SKIPPED — set DATABASE_URL in the repo root .env to run full end-to-end smoke.');
  console.log('  Example: DATABASE_URL=postgresql://user:pass@localhost:5432/financialcheckup');
  process.exit(0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function isProGate(res) {
  return res.status === 403 && res.body?.code === 'UPGRADE_REQUIRED';
}

async function waitForReady(child, req) {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early (code ${child.exitCode}).`);
    }
    try {
      const r = await req('GET', '/api/health');
      if (r.status === 200 && r.body?.status === 'ok') return;
    } catch {
      /* not listening yet */
    }
    await sleep(100);
  }
  throw new Error('Timed out waiting for server /api/health.');
}

(async () => {
  const { req } = createTestClient(PORT);

  const child = spawn(process.execPath, ['index.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: process.env.NODE_ENV || 'development',
      WEEKLY_DIGEST_CRON_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForReady(child, req);

    const month = new Date().toISOString().slice(0, 7);

    let r = await req('GET', '/api/health');
    assert(r.status === 200 && r.body.status === 'ok', `health (${r.status})`);

    r = await req('GET', '/api/market/ticker');
    assert(r.status === 200 && Array.isArray(r.body.items), `market (${r.status})`);

    r = await req('POST', '/api/checkup/preview', {
      income: 5000,
      expenses: [{ category: 'Housing', amount: 1500 }],
      totalExpenses: 2500,
    });
    assert(r.status === 200 && r.body.overallScore != null, `checkup preview (${r.status})`);

    const user = `smoke_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const email = `${user}@smoke.test`;
    r = await req('POST', '/api/auth/register', {
      username: user,
      email,
      password: 'smoke-password-12',
      acceptedTerms: true,
    });
    assert(r.status === 201 && r.body.userId && r.body.username === user, `register (${r.status}): ${JSON.stringify(r.body)}`);

    r = await req('GET', '/api/auth/session');
    assert(r.status === 200 && r.body.authenticated && r.body.username === user, `session after register (${r.status})`);

    r = await req('POST', '/api/auth/register', {
      username: `${user}_2`,
      email: `b${email}`,
      password: 'smoke-password-12',
    });
    assert(r.status === 400 && /terms/i.test(r.body.error || ''), 'register requires terms');

    r = await req('POST', '/api/auth/logout');
    assert(r.status === 200 && r.body.ok === true, 'logout');

    r = await req('GET', '/api/auth/session');
    assert(r.status === 200 && r.body.authenticated === false, 'session cleared after logout');

    r = await req('POST', '/api/auth/login', { username: user, password: 'smoke-password-12' });
    assert(r.status === 200 && r.body.username === user, `login (${r.status})`);

    r = await req('POST', '/api/income', { amount: 5000, month });
    assert(r.status === 200 && Number(r.body.amount) === 5000, `income post (${r.status})`);

    r = await req('POST', '/api/income', { amount: 100, month: 'bad-month' });
    assert(r.status === 400, 'income rejects bad month');

    r = await req('GET', `/api/income?month=${month}`);
    assert(r.status === 200 && Number(r.body.amount) === 5000, `income get (${r.status})`);

    r = await req('GET', `/api/expenses?month=${month}`);
    assert(r.status === 200 && Array.isArray(r.body) && r.body.length > 0, `expenses get (${r.status})`);

    const cat = r.body[0].category;
    r = await req('PUT', '/api/expenses', { month, expenses: [{ category: cat, amount: 125 }] });
    assert(r.status === 200 && r.body.success === true, `expenses put (${r.status})`);

    r = await req('DELETE', '/api/expenses/category', { category: '', month });
    assert(r.status === 400, 'delete category rejects empty');

    r = await req('GET', '/api/expenses/history');
    assert(r.status === 200 && Array.isArray(r.body), `expenses history (${r.status})`);

    r = await req('POST', '/api/checkup/run', { month });
    assert(r.status === 200 && r.body.overallScore != null, `checkup run (${r.status})`);

    r = await req('GET', `/api/checkup/latest?month=${month}`);
    assert(r.status === 200 && r.body.overallScore != null, `checkup latest (${r.status})`);

    r = await req('GET', '/api/me/digest');
    assert(r.status === 200 && typeof r.body.digestEnabled === 'boolean', `digest prefs (${r.status})`);

    r = await req('GET', `/api/reports/forecast?month=${month}`);
    if (!isProGate(r)) {
      assert(r.status === 200 && Array.isArray(r.body.outcomes), `forecast (${r.status})`);
    }

    r = await req('GET', `/api/reports/business-docs?month=${month}&months=12`);
    if (!isProGate(r)) {
      assert(r.status === 200 && r.body.balanceSheet && r.body.incomeStatement, `business docs (${r.status})`);
    }

    r = await req('POST', '/api/goals', {
      name: 'Retirement',
      goalType: 'retirement',
      targetAmount: 100000,
      currentAmount: 5000,
      targetMonth: '2035-01',
    });
    if (!isProGate(r)) {
      assert(r.status === 201 && Number(r.body.currentAmount) === 5000, `goal create (${r.status})`);
      assert(r.body.targetMonth === '2035-01', 'goal targetMonth saved');
    }

    for (const area of ['ai-insights', 'expert', 'comprehensive', 'budget']) {
      r = await req('GET', `/api/ai/specialist/history?area=${area}&limit=5`);
      if (!isProGate(r)) {
        assert(r.status === 200 && Array.isArray(r.body.reports), `history ${area} (${r.status})`);
      }
    }

    r = await req('GET', '/api/ai/specialist/history?area=invalid');
    assert(r.status === 400 || isProGate(r), 'history rejects invalid area or is Pro-gated');

    r = await req('GET', '/api/rankings/leaderboard');
    assert(r.status === 200, `leaderboard (${r.status})`);

    console.log(`Smoke OK (port ${PORT})`);
  } catch (e) {
    console.error('Smoke FAILED:', e?.message ?? e);
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await sleep(200);
    if (child.exitCode === null) child.kill('SIGKILL');
    process.exit(process.exitCode == null ? 0 : process.exitCode);
  }
})();
