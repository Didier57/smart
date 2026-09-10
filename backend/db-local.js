const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config');

const DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, 'smart-local.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lecteur',
    email TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

function ensureDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  if (count === 0) {
    const hash = bcrypt.hashSync(config.DEFAULT_ADMIN_PASS, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)').run(
      config.DEFAULT_ADMIN_USER,
      hash,
      'admin',
      config.DEFAULT_ADMIN_EMAIL || null
    );
    console.log(`[seed] Admin par défaut créé : ${config.DEFAULT_ADMIN_USER}`);
  }
}

ensureDefaultAdmin();

module.exports = db;
