const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'budget.db'));
let db;

async function initDb() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    month TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    month TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_unique ON expenses(user_id, category, month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id, month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, month)`);

  db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    digest_enabled INTEGER NOT NULL DEFAULT 0,
    digest_channel TEXT NOT NULL DEFAULT 'none',
    digest_email TEXT,
    digest_phone TEXT,
    digest_weekday INTEGER NOT NULL DEFAULT 1,
    digest_last_sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  /** Older DBs may have user_preferences without digest columns (CREATE IF NOT EXISTS skips upgrades). */
  const prefCols = new Set(dbAll(`PRAGMA table_info(user_preferences)`).map((c) => c.name));
  const addCol = (name, sqlType) => {
    if (!prefCols.has(name)) {
      db.run(`ALTER TABLE user_preferences ADD COLUMN ${name} ${sqlType}`);
      prefCols.add(name);
    }
  };
  addCol('digest_enabled', 'INTEGER NOT NULL DEFAULT 0');
  addCol('digest_channel', "TEXT NOT NULL DEFAULT 'none'");
  addCol('digest_email', 'TEXT');
  addCol('digest_phone', 'TEXT');
  addCol('digest_weekday', 'INTEGER NOT NULL DEFAULT 1');
  addCol('digest_last_sent_at', 'TEXT');

  db.save();
  console.log('✓ Database ready');
  return db;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  // Get last inserted rowid reliably
  const row = dbAll('SELECT last_insert_rowid() as id')[0];
  db.save();
  return { lastInsertRowid: row?.id ?? null };
}

module.exports = { initDb, dbAll, dbGet, dbRun };
