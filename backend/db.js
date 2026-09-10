const odbc = require('odbc');
const config = require('./config');
const settings = require('./settings');

let pool = null;

function resolveConnectionString() {
  if (settings.hasHostConfigured()) {
    return settings.buildConnectionString(settings.getHfsqlConfig());
  }
  return config.ODBC_CONNECTION_STRING;
}

function canResolveConnectionString() {
  return Boolean(resolveConnectionString());
}

function connectionSource() {
  if (settings.hasHostConfigured()) {
    return { type: 'settings', description: 'Configurée depuis l\'interface (Paramètres)' };
  }
  if (config.ODBC_CONNECTION_STRING) {
    return { type: 'environment', description: 'Définie via ODBC_CONNECTION_STRING' };
  }
  return { type: 'none', description: 'Aucune connexion configurée' };
}

async function connectWith(connStr) {
  return odbc.connect(connStr);
}

async function getConnection() {
  const connStr = resolveConnectionString();
  if (!connStr) {
    throw new Error('Connexion HFSQL non configurée — configurez-la dans Paramètres ou définissez ODBC_CONNECTION_STRING');
  }
  if (!pool) {
    pool = await connectWith(connStr);
    console.log('[ODBC] Connexion établie');
  }
  return pool;
}

async function query(sql, params = []) {
  const conn = await getConnection();
  return conn.query(sql, params);
}

async function tables(catalog, schema) {
  const conn = await getConnection();
  const opts = {};
  if (catalog) opts.catalog = catalog;
  if (schema) opts.schema = schema;
  return conn.tables(opts);
}

async function columns(catalog, schema, table) {
  const conn = await getConnection();
  const opts = {};
  if (catalog) opts.catalog = catalog;
  if (schema) opts.schema = schema;
  if (table) opts.table = table;
  return conn.columns(opts);
}

async function testConnection() {
  const connStr = resolveConnectionString();
  if (!connStr) {
    return { ok: false, message: 'Aucune connexion HFSQL configurée — allez dans Paramètres' };
  }
  let conn;
  try {
    conn = await connectWith(connStr);
    await conn.query('SELECT 1');
    return { ok: true, message: 'Connexion ODBC active' };
  } catch (err) {
    pool = null;
    return { ok: false, message: err.message };
  } finally {
    if (conn && conn !== pool) {
      try { await conn.close(); } catch {}
    }
  }
}

async function testConnectionString(connStr) {
  if (!connStr) return { ok: false, message: 'Chaîne de connexion vide' };
  const start = Date.now();
  let conn;
  try {
    conn = await connectWith(connStr);
    await conn.query('SELECT 1');
    return { ok: true, message: 'Connexion réussie', latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, message: err.message, latencyMs: Date.now() - start };
  } finally {
    if (conn) {
      try { await conn.close(); } catch {}
    }
  }
}

async function reset() {
  if (pool) {
    try { await pool.close(); } catch {}
  }
  pool = null;
}

async function close() {
  await reset();
}

module.exports = {
  getConnection,
  query,
  tables,
  columns,
  testConnection,
  testConnectionString,
  reset,
  close,
  resolveConnectionString,
  canResolveConnectionString,
  connectionSource
};