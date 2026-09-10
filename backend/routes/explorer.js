const express = require('express');
const { requireAuth } = require('../auth');
const odbc = require('../db');

const router = express.Router();

router.get('/health', requireAuth, async (req, res) => {
  try {
    const result = await odbc.testConnection();
    res.json(result);
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

router.get('/tables', requireAuth, async (req, res) => {
  try {
    const rows = await odbc.tables();
    const tables = rows.map((r) => ({
      catalog: r.TABLE_CAT || null,
      schema: r.TABLE_SCHEM || null,
      name: r.TABLE_NAME,
      type: r.TABLE_TYPE || 'TABLE',
      remarks: r.REMARKS || null
    }));
    res.json(tables);
  } catch (err) {
    console.error('[explorer] Erreur tables:', err.message);
    res.status(500).json({ error: 'Impossible de lister les tables: ' + err.message });
  }
});

router.get('/columns/:tableName', requireAuth, async (req, res) => {
  try {
    const rows = await odbc.columns(null, null, req.params.tableName);
    const columns = rows.map((r) => ({
      name: r.COLUMN_NAME,
      type: r.TYPE_NAME,
      size: r.COLUMN_SIZE,
      nullable: r.NULLABLE === 1,
      remarks: r.REMARKS || null,
      ordinal: r.ORDINAL_POSITION
    }));
    res.json(columns);
  } catch (err) {
    console.error('[explorer] Erreur colonnes:', err.message);
    res.status(500).json({ error: 'Impossible de lister les colonnes: ' + err.message });
  }
});

router.get('/data/:tableName', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;
    const sortCol = req.query.sort || null;
    const sortDir = req.query.dir === 'DESC' ? 'DESC' : 'ASC';
    const search = req.query.search || null;

    const tableName = req.params.tableName;

    let countSql = `SELECT COUNT(*) AS total FROM "${tableName}"`;
    let dataSql = `SELECT * FROM "${tableName}"`;

    const params = [];

    if (search) {
      const columns = await odbc.columns(null, null, tableName);
      const textCols = columns.filter(c => ['VARCHAR', 'CHAR', 'CLOB', 'TEXT', 'NVARCHAR', 'NCHAR', 'NCLOB', 'STRING'].includes(c.TYPE_NAME?.toUpperCase()));
      if (textCols.length > 0) {
        const conditions = textCols.map(c => `CAST("${c.COLUMN_NAME}" AS VARCHAR(500)) LIKE ?`);
        const searchPattern = `%${search}%`;
        params.push(...textCols.map(() => searchPattern));
        const whereClause = ` WHERE (${conditions.join(' OR ')})`;
        countSql += whereClause;
        dataSql += whereClause;
      }
    }

    if (sortCol) {
      const validDir = sortDir === 'DESC' ? 'DESC' : 'ASC';
      dataSql += ` ORDER BY "${sortCol}" ${validDir}`;
    }

    dataSql += ` LIMIT ? OFFSET ?`;

    const countResult = await odbc.query(countSql, params);
    const total = Number(countResult[0]?.total || countResult[0]?.TOTAL || 0);

    const data = await odbc.query(dataSql, [...params, limit, offset]);

    res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[explorer] Erreur data:', err.message);
    res.status(500).json({ error: 'Erreur lecture données: ' + err.message });
  }
});

module.exports = router;
