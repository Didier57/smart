const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');
const settings = require('../settings');
const odbc = require('../db');
const config = require('../config');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/hfsql', (req, res) => {
  const cfg = settings.getHfsqlConfig();
  res.json({
    dsn: cfg.dsn,
    host: cfg.host,
    port: cfg.port,
    uid: cfg.uid,
    database: cfg.database,
    driver: cfg.driver,
    passwordSet: Boolean(cfg.pwd),
    source: odbc.connectionSource(),
    envFallback: Boolean(config.ODBC_CONNECTION_STRING)
  });
});

router.post('/hfsql/test', async (req, res) => {
  const { dsn, host, port, uid, pwd, database, driver } = req.body || {};
  const current = settings.getHfsqlConfig();
  const cfg = {
    dsn: typeof dsn === 'string' ? dsn.trim() : current.dsn,
    host: typeof host === 'string' ? host.trim() : current.host,
    port: typeof port === 'string' ? port.trim() : current.port,
    uid: typeof uid === 'string' ? uid.trim() : current.uid,
    pwd: (typeof pwd === 'string' && pwd !== '') ? pwd : current.pwd,
    database: typeof database === 'string' ? database.trim() : current.database,
    driver: (typeof driver === 'string' && driver.trim() !== '') ? driver.trim() : current.driver
  };
  const connStr = settings.buildConnectionString(cfg);
  if (!connStr) {
    return res.status(400).json({ ok: false, error: 'Veuillez renseigner soit un DSN, soit le pilote et le serveur' });
  }
  const result = await odbc.testConnectionString(connStr);
  res.json(result);
});

router.put('/hfsql', async (req, res) => {
  const { dsn, host, port, uid, pwd, database, driver } = req.body || {};
  const current = settings.getHfsqlConfig();
  const newPwd = (typeof pwd === 'string' && pwd !== '') ? pwd : current.pwd;

  settings.saveHfsqlConfig({
    dsn: (typeof dsn === 'string' && dsn.trim() !== '') ? dsn.trim() : '',
    host,
    port,
    uid,
    pwd: newPwd,
    database,
    driver: (typeof driver === 'string' && driver.trim() !== '') ? driver : current.driver
  });

  await odbc.reset();
  const test = await odbc.testConnection();

  res.json({ ok: true, test, passwordSet: Boolean(newPwd) });
});

module.exports = router;