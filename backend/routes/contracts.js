const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');
const odbc = require('../db');

const router = express.Router();

const SELECT_KEYS = [
  'IDContract', 'SAP_EWP', 'SAP_EUPAC', 'WBS', 'SoldtoParty', 'Customer_name',
  'Main_contractual_subject', 'Acc_Manager', 'Amount', 'Contract_type', 'Service_Type',
  'SC', 'Contract_included', 'RTP1', 'RTP2', 'RTP3', 'Intervention_time', 'Repair_time',
  'Service_window', 'Preventive_maintenance', 'Backups', 'Remote_Service', 'SW_Upgrades',
  'Created_date', 'CSO', 'Contract_start', 'Duration_month', 'Contract_end',
  'Renew_month', 'Billing', 'Garantie', 'Remarks_BAC', 'GA', 'Customer_Group',
  'Product_Group', 'F5', 'AM_Signature', 'Contract_Stop', 'phone_include',
  'COntract_stop_date', 'Customer_name_sap', 'IDClient', 'Remote'
];

function sanitize(row) {
  if (!row) return row;
  const r = {};
  for (const [k, v] of Object.entries(row)) {
    r[k] = typeof v === 'bigint' ? Number(v) : v;
  }
  return r;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await odbc.query(
      `SELECT ${SELECT_KEYS.map(k => '"' + k + '"').join(', ')} FROM "Contract"`
    );
    res.json((rows || []).map(sanitize));
  } catch (err) {
    console.error('[contracts] GET / error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrats' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id).replace(/'/g, "''");
    const rows = await odbc.query(
      `SELECT ${SELECT_KEYS.map(k => '"' + k + '"').join(', ')} FROM "Contract" WHERE IDContract = ${id}`
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Contrat introuvable' });
    res.json(sanitize(rows[0]));
  } catch (err) {
    console.error('[contracts] GET /:id error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const esc = v => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const num = v => v == null || v === '' ? 'NULL' : Number(v);
    const cols = [
      'Customer_name', 'Main_contractual_subject', 'SAP_EUPAC', 'WBS', 'SoldtoParty',
      'Acc_Manager', 'Amount', 'Contract_type', 'Service_Type', 'Service_window',
      'Contract_start', 'Duration_month', 'Contract_end', 'Remarks_BAC', 'Billing',
      'Renew_month', 'IDClient', 'Created_date'
    ];
    const vals = [
      esc(b.Customer_name), esc(b.Main_contractual_subject), esc(b.SAP_EUPAC),
      esc(b.WBS), esc(b.SoldtoParty), esc(b.Acc_Manager),
      num(b.Amount), num(b.Contract_type), esc(b.Service_Type), esc(b.Service_window),
      esc(b.Contract_start), num(b.Duration_month), esc(b.Contract_end),
      esc(b.Remarks_BAC), num(b.Billing), num(b.Renew_month),
      num(b.IDClient), esc(b.Created_date || new Date().toISOString().slice(0, 10))
    ];
    const sql = `INSERT INTO "Contract" (${cols.map(c => '"' + c + '"').join(', ')}) VALUES (${vals.join(', ')})`;
    await odbc.query(sql);
    const ids = await odbc.query('SELECT MAX(IDContract) AS newId FROM "Contract"');
    const newId = ids?.[0]?.newId;
    res.json({ ok: true, id: newId });
  } catch (err) {
    console.error('[contracts] POST / error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du contrat: ' + err.message });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id).replace(/'/g, "''");
    const b = req.body || {};
    const esc = v => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const num = v => v == null || v === '' ? 'NULL' : Number(v);
    const fields = [
      'Customer_name', 'Main_contractual_subject', 'SAP_EUPAC', 'WBS', 'SoldtoParty',
      'Acc_Manager', 'Service_Type', 'Service_window', 'Contract_start', 'Contract_end',
      'Remarks_BAC', 'F5', 'AM_Signature', 'Customer_Group', 'Product_Group',
      'Preventive_maintenance', 'Backups', 'Remote_Service', 'SW_Upgrades', 'CSO'
    ];
    const numFields = [
      'Amount', 'Contract_type', 'SC', 'Contract_included', 'RTP1', 'RTP2', 'RTP3',
      'Intervention_time', 'Repair_time', 'Duration_month', 'Renew_month', 'Billing',
      'Garantie', 'GA', 'Contract_Stop', 'phone_include', 'Remote'
    ];
    const parts = [];
    for (const f of fields) {
      if (b[f] !== undefined) parts.push(`"${f}" = ${esc(b[f])}`);
    }
    for (const f of numFields) {
      if (b[f] !== undefined) parts.push(`"${f}" = ${num(b[f])}`);
    }
    if (parts.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier' });
    await odbc.query(`UPDATE "Contract" SET ${parts.join(', ')} WHERE IDContract = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[contracts] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contrat: ' + err.message });
  }
});

module.exports = router;
