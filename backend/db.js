const odbc = require('odbc');
const config = require('./config');

let pool = null;

async function getConnection() {
  if (!config.ODBC_CONNECTION_STRING) {
    throw new Error('ODBC_CONNECTION_STRING non défini — vérifiez le fichier .env');
  }
  if (!pool) {
    pool = await odbc.connect(config.ODBC_CONNECTION_STRING);
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
  try {
    const conn = await getConnection();
    await conn.query('SELECT 1');
    return { ok: true, message: 'Connexion ODBC active' };
  } catch (err) {
    pool = null;
    return { ok: false, message: err.message };
  }
}

async function close() {
  if (pool) {
    try { await pool.close(); } catch {}
    pool = null;
  }
}

module.exports = { getConnection, query, tables, columns, testConnection, close };
