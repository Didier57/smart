const express = require('express');
const { requireAuth } = require('../auth');
const odbc = require('../db');

const router = express.Router();

router.get('/:tableName/csv', requireAuth, async (req, res) => {
  try {
    const tableName = req.params.tableName;
    const data = await odbc.query(`SELECT * FROM "${tableName}"`);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée' });
    }

    const cols = Object.keys(data[0]);
    const header = cols.map(c => `"${c}"`).join(';');
    const lines = data.map(row =>
      cols.map(c => {
        const v = row[c] == null ? '' : String(row[c]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(';')
    );
    const csv = '\uFEFF' + [header, ...lines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[export] Erreur CSV:', err.message);
    res.status(500).json({ error: 'Erreur export: ' + err.message });
  }
});

module.exports = router;
