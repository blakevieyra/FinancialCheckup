'use strict';

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 30100 + (process.pid % 500);
const tmpDb = path.join(os.tmpdir(), `financialcheckup-smoke-${process.pid}-${Date.now()}.db`);

function req(method, pathname, token, jsonBody) {
  return new Promise((resolve, reject) => {
    const body =
      jsonBody === undefined ? null : typeof jsonBody === 'string' ? jsonBody : JSON.stringify(jsonBody);

    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path: pathname,
      method,
      headers: {},
    };

    if (body !== null && body !== '') {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const client = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => {
        raw += c;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    client.on('error', reject);
    if (body) client.write(body);
    client.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitForReady(child) {
  for (let i = 0; i < 60; i += 1) {
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
  const child = spawn(process.execPath, ['index.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_PATH: tmpDb,
      // Skip repo .env quirks for deterministic smoke paths
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForReady(child);

    let r = await req('GET', '/api/health');
    assert(r.status === 200 && r.body.status === 'ok', `health (${r.status})`);
    assert(r.body.features?.weeklyDigest === true, 'health should advertise weeklyDigest feature');

    const user = `smoke_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    r = await req('POST', '/api/auth/register', undefined, {
      username: user,
      password: 'smoke-password-12',
    });
    assert(r.status === 201 && typeof r.body.token === 'string', `register (${r.status}): ${JSON.stringify(r.body)}`);
    const token = r.body.token;

    r = await req(
      'POST',
      '/api/auth/login',
      undefined,
      { username: user, password: 'smoke-password-12' },
    );
    assert(r.status === 200 && r.body.username === user, `login (${r.status}): ${JSON.stringify(r.body)}`);

    r = await req('POST', '/api/income', token, { amount: 5000, month: '2026-05' });
    assert(r.status === 200 && Number(r.body.amount) === 5000, `income post (${r.status})`);

    r = await req('GET', '/api/income?month=2026-05', token);
    assert(r.status === 200 && Number(r.body.amount) === 5000, `income get (${r.status})`);

    r = await req('GET', '/api/expenses?month=2026-05', token);
    assert(
      r.status === 200 && Array.isArray(r.body) && r.body.length > 0,
      `expenses get (${r.status})`,
    );

    const cat = r.body[0].category;
    r = await req(
      'PUT',
      '/api/expenses',
      token,
      { month: '2026-05', expenses: [{ category: cat, amount: 125 }] },
    );
    assert(r.status === 200 && r.body.success === true, `expenses put (${r.status})`);

    r = await req('GET', '/api/expenses/history', token);
    assert(r.status === 200 && Array.isArray(r.body), `expenses history (${r.status})`);

    r = await req('GET', '/api/me/digest', token);
    assert(
      r.status === 200 && r.body && typeof r.body.digestEnabled === 'boolean',
      `digest prefs get (${r.status}): ${JSON.stringify(r.body)}`,
    );
    assert(r.body.preview && typeof r.body.preview.grade === 'string', 'digest prefs should include preview payload');

    r = await req('PUT', '/api/me/digest', token, {
      digestEnabled: false,
      digestChannel: 'none',
      digestEmail: '',
      digestPhone: '',
      digestWeekday: 1,
    });
    assert(r.status === 200 && r.body.digestChannel === 'none', `digest prefs put (${r.status})`);

    r = await req('GET', '/api/reports/forecast?month=2026-05', token);
    assert(r.status === 200 && Array.isArray(r.body.outcomes), `forecast (${r.status})`);

    r = await req('GET', '/api/reports/business-docs?month=2026-05&months=12', token);
    assert(r.status === 200 && r.body.balanceSheet && r.body.incomeStatement, `business docs (${r.status})`);

    console.log(`Smoke OK (port ${PORT})`);
  } catch (e) {
    console.error('Smoke FAILED:', e?.message ?? e);
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await sleep(200);
    if (child.exitCode === null) child.kill('SIGKILL');

    fs.promises.unlink(tmpDb).catch(() => {});
    const wal = `${tmpDb}-wal`;
    const shm = `${tmpDb}-shm`;
    fs.promises.unlink(wal).catch(() => {});
    fs.promises.unlink(shm).catch(() => {});

    process.exit(process.exitCode == null ? 0 : process.exitCode);
  }
})();
