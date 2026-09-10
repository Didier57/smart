const express = require('express');
const { requireAuth } = require('../auth');
const odbc = require('../db');

function getVersion() {
  try {
    return require('../package.json').version || '';
  } catch {
    return '';
  }
}

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const health = await odbc.testConnection();
  res.json({
    ok: true,
    odbc: health,
    hasConnectionString: odbc.canResolveConnectionString(),
    source: odbc.connectionSource(),
    version: getVersion()
  });
});

module.exports = router;