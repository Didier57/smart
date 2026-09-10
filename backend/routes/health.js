const express = require('express');
const { requireAuth } = require('../auth');
const odbc = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const health = await odbc.testConnection();
  res.json({
    ok: true,
    odbc: health,
    hasConnectionString: !!config.ODBC_CONNECTION_STRING,
    version: require('../../package.json').version
  });
});

module.exports = router;
