const db = require('./db-local');

function get(key, def) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : def;
}

function set(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

const DEFAULT_DRIVER = 'HFSQL';

function getHfsqlConfig() {
  return {
    dsn: get('hfsql.dsn', ''),
    host: get('hfsql.host', ''),
    port: get('hfsql.port', ''),
    uid: get('hfsql.uid', ''),
    pwd: get('hfsql.pwd', ''),
    database: get('hfsql.database', ''),
    driver: get('hfsql.driver', DEFAULT_DRIVER)
  };
}

function saveHfsqlConfig(cfg) {
  set('hfsql.dsn', String(cfg.dsn || '').trim());
  set('hfsql.host', String(cfg.host || '').trim());
  set('hfsql.port', String(cfg.port || '').trim());
  set('hfsql.uid', String(cfg.uid || '').trim());
  set('hfsql.pwd', cfg.pwd || '');
  set('hfsql.database', String(cfg.database || '').trim());
  set('hfsql.driver', String(cfg.driver || DEFAULT_DRIVER).trim());
}

function hasHostConfigured() {
  return Boolean(get('hfsql.host') || get('hfsql.dsn'));
}

function buildConnectionString(cfg) {
  const parts = [];
  const dsn = String(cfg.dsn || '').trim();
  if (dsn) {
    parts.push(`DSN=${dsn}`);
    if (cfg.uid) parts.push(`UID=${cfg.uid}`);
    if (cfg.pwd) parts.push(`PWD=${cfg.pwd}`);
    return parts.join(';');
  }
  const driver = String(cfg.driver || '').trim();
  if (driver) {
    parts.push(driver.startsWith('{') ? `Driver=${driver}` : `Driver={${driver}}`);
  }
  if (cfg.host) parts.push(`Host=${cfg.host}`);
  if (cfg.port) parts.push(`Port=${cfg.port}`);
  if (cfg.database) parts.push(`DATABASE=${cfg.database}`);
  if (cfg.uid) parts.push(`UID=${cfg.uid}`);
  if (cfg.pwd) parts.push(`PWD=${cfg.pwd}`);
  return parts.join(';');
}

module.exports = { get, set, getHfsqlConfig, saveHfsqlConfig, hasHostConfigured, buildConnectionString, DEFAULT_DRIVER };