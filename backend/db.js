const odbc = require('odbc');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('./config');
const settings = require('./settings');

const CONNECT_TIMEOUT_MS = 20000;

let pool = null;

/* Le pilote ODBC HFSQL (PCSoft) sous Linux ne fonctionne qu'avec iODBC ;
 * node-odbc repose sur unixODBC et renvoie une erreur corrompue ("0 U").
 * Sous Linux on passe donc par un petit helper C compilé contre iODBC
 * (backend/hfcli/hfcli.c, compilé dans l'image Docker). node-odbc reste
 * utilisé en secours (développement local Windows, image sans hfcli). */
const HFCLI =
  process.platform === 'linux' && fs.existsSync('/usr/local/bin/hfcli')
    ? '/usr/local/bin/hfcli'
    : null;
const execFileAsync = promisify(execFile);

async function hfcliRun(connStr, args, timeoutMs) {
  if (!connStr) {
    throw new Error('Connexion HFSQL non configurée — configurez-la dans Paramètres ou définissez ODBC_CONNECTION_STRING');
  }
  try {
    const { stdout } = await execFileAsync(HFCLI, [connStr, ...args], {
      timeout: timeoutMs || 60000,
      maxBuffer: 256 * 1024 * 1024,
      windowsHide: true
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err && err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {}
    }
    throw new Error(err.message || String(err));
  }
}

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
  const engine = HFCLI ? 'iODBC (hfcli)' : 'node-odbc / unixODBC';
  if (settings.hasHostConfigured()) {
    return { type: 'settings', description: 'Configurée depuis l\'interface (Paramètres)', engine };
  }
  if (config.ODBC_CONNECTION_STRING) {
    return { type: 'environment', description: 'Définie via ODBC_CONNECTION_STRING', engine };
  }
  return { type: 'none', description: 'Aucune connexion configurée', engine };
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
        const pick =
          lines.find(l => /SQLDriverConnect|SQLConnect/.test(l)) ||
          lines.find(l => /Module=<|Version=</.test(l)) ||
          lines.find(l => /already defined|déjà décrit|deja decrit/i.test(l)) ||
          lines.find(l => /file not found|can['’]t open/i.test(l)) ||
          [...lines].reverse().find(l => /SQLSTATE=/i.test(l)) ||
          '';
        if (pick) {
          resolve(scrubPwd(pick));
        } else {
          resolve(scrubPwd(text).replace(/\s+/g, ' ').slice(0, 500));
        }
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
  if (HFCLI) {
    const args = ['query', sql, ...params.map(p => (p == null ? '\x03NULL' : String(p)))];
    const res = await hfcliRun(resolveConnectionString(), args, 120000);
    if (!res.ok) throw new Error(explainDriverError(res.message || 'Échec de la requête'));
    return res.rows;
  }
  const conn = await getConnection();
  return conn.query(sql, params);
}

async function tables(catalog, schema) {
  if (HFCLI) {
    const res = await hfcliRun(resolveConnectionString(), ['tables'], 60000);
    if (!res.ok) throw new Error(explainDriverError(res.message || 'Échec de la liste des tables'));
    return res.rows;
  }
  const conn = await getConnection();
  const opts = {};
  if (catalog) opts.catalog = catalog;
  if (schema) opts.schema = schema;
  return conn.tables(opts);
}

async function columns(catalog, schema, table) {
  if (HFCLI) {
    const res = await hfcliRun(resolveConnectionString(), ['columns', table || ''], 60000);
    if (!res.ok) throw new Error(explainDriverError(res.message || 'Échec de la liste des colonnes'));
    return res.rows;
  }
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
  return testConnectionString(connStr);
}

async function testConnectionString(connStr) {
  if (!connStr) return { ok: false, message: 'Chaîne de connexion vide' };
  const start = Date.now();
  if (HFCLI) {
    try {
      const res = await hfcliRun(connStr, ['test'], CONNECT_TIMEOUT_MS + 10000);
      return {
        ok: Boolean(res.ok),
        message: scrubPwd(res.ok ? res.message : explainDriverError(res.message || 'Échec de connexion')),
        latencyMs: typeof res.latencyMs === 'number' ? res.latencyMs : Date.now() - start
      };
    } catch (err) {
      return { ok: false, message: scrubPwd(err.message), latencyMs: Date.now() - start };
    }
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