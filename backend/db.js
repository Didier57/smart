const odbc = require('odbc');
const { execFile } = require('child_process');
const config = require('./config');
const settings = require('./settings');

const CONNECT_TIMEOUT_MS = 20000;

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

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

function explainDriverError(text) {
  const low = text.toLowerCase();
  if (
    low.includes('already defined') ||
    low.includes('déjà décrit') ||
    low.includes('deja decrit') ||
    low.includes('already exists')
  ) {
    return `${text} — Fichier déjà décrit : le pilote HFSQL ne peut pas décrire deux fois le même fichier (erreur 70207). Cause fréquente : deux tables de la base dont les noms ne diffèrent que par un caractère accentué, ou un fichier déjà ouvert par une autre session sur ce serveur. Vérifiez la base côté serveur HFSQL.`;
  }
  return text;
}

function formatOdbcError(err) {
  if (!err) return 'Erreur inconnue';
  let text;
  const odbcErrors = err.odbcErrors;
  if (Array.isArray(odbcErrors) && odbcErrors.length) {
    text = odbcErrors
      .map(e => {
        const state = e.state || '';
        const msg = (e.message || '').replace(/[[\]]/g, m => (m === '[' ? '(' : ')'));
        return [state, msg].filter(Boolean).join(' ');
      })
      .join(' | ');
  } else {
    text = err.message || String(err);
  }
  return explainDriverError(text);
}

function scrubPwd(text) {
  return String(text).replace(/PWD=[^;\s]*/gi, 'PWD=***');
}

function driverDetail(connStr) {
  return new Promise(resolve => {
    execFile('iodbctest', [scrubPwd(connStr)], {
      timeout: 8000,
      maxBuffer: 32 * 1024
    }, (error, stdout, stderr) => {
      try {
        const text = `${stdout || ''}\n${stderr || ''}`;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const pick = lines.find(l =>
          /(already defined|déjà décrit|deja decrit|SQLSTATE=|file not found|can't open)/i.test(l)
        );
        resolve(pick ? scrubPwd(pick) : '');
      } catch {
        resolve('');
      }
    });
  });
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
    conn = await withTimeout(connectWith(connStr), CONNECT_TIMEOUT_MS, 'Délai de connexion dépassé — le serveur ne répond pas ou le pilote bloque');
    let note = '';
    try {
      await conn.query('SELECT 1');
    } catch {
      note = ' (connexion établie, mais SELECT 1 refusé par le pilote)';
    }
    return { ok: true, message: 'Connexion ODBC active' + note };
  } catch (err) {
    pool = null;
    return { ok: false, message: formatOdbcError(err) };
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
    conn = await withTimeout(connectWith(connStr), CONNECT_TIMEOUT_MS, 'Délai de connexion dépassé — le serveur ne répond pas ou le pilote bloque');
    let note = '';
    try {
      await conn.query('SELECT 1');
    } catch {
      note = ' (connexion établie, mais SELECT 1 refusé par le pilote)';
    }
    return { ok: true, message: 'Connexion réussie' + note, latencyMs: Date.now() - start };
  } catch (err) {
    let message = formatOdbcError(scrubPwd(err));
    const detail = await driverDetail(connStr);
    if (detail) {
      message = `${message} — (détail iODBC : ${detail})`;
    }
    return { ok: false, message, latencyMs: Date.now() - start };
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
  connectionSource,
  formatOdbcError
};