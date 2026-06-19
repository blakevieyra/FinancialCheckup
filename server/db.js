const { Pool } = require('pg');

let pool;

/** Tables whose primary key is `id`; INSERTs into these auto-RETURN id so callers
 *  can keep using the legacy { lastInsertRowid } shape inherited from the SQLite era. */
const TABLES_WITH_ID_PK = new Set(['users', 'income', 'expenses', 'expenses_log', 'goals']);

/** Default ISO-8601 UTC timestamp expression used everywhere we used to call SQLite's datetime('now'). */
const ISO_NOW_DEFAULT = `to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

/** Translate legacy SQLite-style `?` placeholders into Postgres `$1`, `$2`, … */
function translateParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => {
    i += 1;
    return `$${i}`;
  });
}

function isInsertSql(sql) {
  return /^\s*INSERT\s+/i.test(sql);
}

function alreadyHasReturning(sql) {
  return /\sRETURNING\s/i.test(sql);
}

function tableNameFromInsert(sql) {
  const m = sql.match(/^\s*INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  return m ? m[1].toLowerCase() : null;
}

async function rawQuery(sql, params = []) {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool.query(translateParams(sql), params);
}

/** Returns first row or null. Mirrors the previous synchronous helper signature, now Promise-based. */
async function dbGet(sql, params = []) {
  const r = await rawQuery(sql, params);
  return r.rows[0] ?? null;
}

/** Returns all rows. */
async function dbAll(sql, params = []) {
  const r = await rawQuery(sql, params);
  return r.rows;
}

/**
 * Run mutating SQL (INSERT/UPDATE/DELETE).
 * For INSERTs into a known id-PK table we auto-append `RETURNING id` so the legacy
 * `{ lastInsertRowid }` contract keeps working. For everything else lastInsertRowid is null.
 */
async function dbRun(sql, params = []) {
  let finalSql = sql;
  if (isInsertSql(sql) && !alreadyHasReturning(sql)) {
    const t = tableNameFromInsert(sql);
    if (t && TABLES_WITH_ID_PK.has(t)) {
      finalSql = `${sql.replace(/;\s*$/, '')} RETURNING id`;
    }
  }
  const r = await rawQuery(finalSql, params);
  const lastInsertRowid = r.rows && r.rows.length > 0 ? r.rows[0].id ?? null : null;
  return { lastInsertRowid, rowCount: r.rowCount };
}

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Provision a Postgres database (Render Postgres or local) and export DATABASE_URL.',
    );
  }

  /** Render-managed Postgres requires SSL; allow self-signed (Render uses an internal CA). */
  const useSsl =
    /sslmode=require/i.test(connectionString) ||
    process.env.NODE_ENV === 'production' ||
    process.env.PGSSL === '1';

  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (err) => {
    console.error('[pg] idle client error:', err.message);
  });

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS income (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  await rawQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_unique ON expenses(user_id, category, month)`);
  await rawQuery(`CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id, month)`);
  await rawQuery(`CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, month)`);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS expenses_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      logged_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT},
      source TEXT NOT NULL DEFAULT 'manual'
    )
  `);
  await rawQuery(`CREATE INDEX IF NOT EXISTS idx_expenses_log_user_month ON expenses_log(user_id, month)`);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      digest_enabled INTEGER NOT NULL DEFAULT 0,
      digest_channel TEXT NOT NULL DEFAULT 'none',
      digest_email TEXT,
      digest_phone TEXT,
      digest_weekday INTEGER NOT NULL DEFAULT 1,
      digest_last_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  /** Older deployments may have user_preferences without these columns. Postgres 9.6+ supports IF NOT EXISTS. */
  const prefMigrations = [
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_enabled INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_channel TEXT NOT NULL DEFAULT 'none'`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_email TEXT`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_phone TEXT`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_weekday INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_last_sent_at TEXT`,
  ];
  for (const stmt of prefMigrations) await rawQuery(stmt);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal_type TEXT NOT NULL DEFAULT 'custom',
      target_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      current_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      target_month TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);
  await rawQuery(`CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status, updated_at)`);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS checkup_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      snapshot_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS checkup_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);
  await rawQuery(`CREATE INDEX IF NOT EXISTS idx_checkup_history_user ON checkup_history(user_id, month, created_at DESC)`);

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      status TEXT NOT NULL DEFAULT 'free',
      plan TEXT NOT NULL DEFAULT 'free',
      current_period_end TEXT,
      updated_at TEXT NOT NULL DEFAULT ${ISO_NOW_DEFAULT}
    )
  `);

  console.log('✓ Postgres database ready');
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { initDb, closeDb, dbAll, dbGet, dbRun, rawQuery };
