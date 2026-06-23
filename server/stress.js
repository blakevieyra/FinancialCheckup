'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Local stress test — requires DATABASE_URL in repo root .env.
 * Usage: STRESS_CONCURRENCY=25 STRESS_ROUNDS=3 node stress.js
 */
const { spawn } = require('child_process');
const { createTestClient } = require('./testHttp');

const PORT = 30200 + (process.pid % 500);
const CONCURRENCY = Math.min(Math.max(Number(process.env.STRESS_CONCURRENCY) || 20, 5), 80);
const ROUNDS = Math.min(Math.max(Number(process.env.STRESS_ROUNDS) || 2, 1), 10);

if (!process.env.DATABASE_URL) {
  console.log('Stress SKIPPED — set DATABASE_URL in the repo root .env.');
  process.exit(0);
}

async function timedReq(req, ...args) {
  const start = Date.now();
  try {
    const r = await req(...args);
    return { ...r, ms: Date.now() - start, ok: true };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e.message };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForReady(child, req) {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) throw new Error('Server exited early.');
    try {
      const r = await req('GET', '/api/health');
      if (r.status === 200) return;
    } catch { /* wait */ }
    await sleep(100);
  }
  throw new Error('Health timeout');
}

async function runPool(tasks, limit) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

(async () => {
  const { req } = createTestClient(PORT);

  const child = spawn(process.execPath, ['index.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'development',
      WEEKLY_DIGEST_CRON_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForReady(child, req);

    const user = `stress_${Date.now()}`;
    const reg = await req('POST', '/api/auth/register', {
      username: user,
      email: `${user}@stress.test`,
      password: 'stress-password-12',
      acceptedTerms: true,
    });
    if (reg.status !== 201) throw new Error(`register failed ${reg.status}`);

    await req('POST', '/api/income', { amount: 6000, month: '2026-06' });
    const exp = await req('GET', '/api/expenses?month=2026-06');
    const cat = exp.body[0]?.category || 'Other';

    const scenarios = [];
    for (let round = 0; round < ROUNDS; round += 1) {
      for (let i = 0; i < CONCURRENCY; i += 1) {
        const n = i + round * CONCURRENCY;
        if (n % 4 === 0) {
          scenarios.push(() => timedReq(req, 'GET', '/api/health'));
        } else if (n % 4 === 1) {
          scenarios.push(() =>
            timedReq(req, 'POST', '/api/checkup/preview', {
              income: 5000 + n,
              expenses: [{ category: cat, amount: 100 + n }],
              totalExpenses: 2000 + n,
            }),
          );
        } else if (n % 4 === 2) {
          scenarios.push(() =>
            timedReq(req, 'PUT', '/api/expenses', {
              month: '2026-06',
              expenses: [{ category: cat, amount: 50 + (n % 200) }],
            }),
          );
        } else {
          scenarios.push(() => timedReq(req, 'GET', '/api/market/ticker'));
        }
      }
    }

    const start = Date.now();
    const results = await runPool(scenarios, Math.min(CONCURRENCY, 30));
    const elapsed = Date.now() - start;

    const ok = results.filter((r) => r.ok && r.status >= 200 && r.status < 500);
    const failed = results.filter((r) => !r.ok || r.status >= 500);
    const latencies = ok.map((r) => r.ms).sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    console.log(`Stress: ${results.length} requests in ${elapsed}ms`);
    console.log(`  OK: ${ok.length}  Failed: ${failed.length}`);
    console.log(`  Latency avg ${avg.toFixed(0)}ms  p95 ${p95}ms`);

    if (failed.length) {
      console.error('  Sample failures:', failed.slice(0, 3).map((f) => f.error || f.status));
      process.exitCode = 1;
    } else if (p95 > 15000) {
      console.warn('  WARN: p95 latency high — consider pool tuning or query optimization.');
    } else {
      console.log('Stress OK');
    }
  } catch (e) {
    console.error('Stress FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await sleep(200);
    if (child.exitCode === null) child.kill('SIGKILL');
    process.exit(process.exitCode == null ? 0 : process.exitCode);
  }
})();
