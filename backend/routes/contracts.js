const express = require('express');
const { requireAuth } = require('../auth');
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

const FIELD_TYPES = {
  IDContract: 'num',
  SAP_EWP: 'text',
  SAP_EUPAC: 'text',
  WBS: 'text',
  SoldtoParty: 'text',
  Customer_name: 'text',
  Main_contractual_subject: 'text',
  Acc_Manager: 'text',
  Amount: 'num',
  Contract_type: 'num',
  Service_Type: 'text',
  SC: 'bool',
  Contract_included: 'bool',
  RTP1: 'num',
  RTP2: 'num',
  RTP3: 'num',
  Intervention_time: 'num',
  Repair_time: 'num',
  Service_window: 'text',
  Preventive_maintenance: 'bool',
  Backups: 'bool',
  Remote_Service: 'bool',
  SW_Upgrades: 'bool',
  Created_date: 'date',
  CSO: 'text',
  Contract_start: 'date',
  Duration_month: 'num',
  Contract_end: 'date',
  Renew_month: 'num',
  Billing: 'num',
  Garantie: 'bool',
  Remarks_BAC: 'text',
  GA: 'bool',
  Customer_Group: 'text',
  Product_Group: 'text',
  F5: 'bool',
  AM_Signature: 'bool',
  Contract_Stop: 'bool',
  phone_include: 'bool',
  COntract_stop_date: 'date',
  Customer_name_sap: 'text',
  IDClient: 'num',
  Remote: 'bool'
};

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

router.put('/:id', requireAuth, async (req, res) => {
  const { user } = req;
  if (user.role !== 'admin' && !user.gestionClient) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  try {
    const id = String(req.params.id).replace(/'/g, "''");
    const b = req.body || {};
    const esc = v => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const num = v => v == null || v === '' ? 'NULL' : Number(v);
    const parts = [];
    for (const [f, type] of Object.entries(FIELD_TYPES)) {
      if (f === 'IDContract' || b[f] === undefined) continue;
      let val;
      if (type === 'bool') val = b[f] ? 1 : 0;
      else if (type === 'num') val = num(b[f]);
      else val = esc(b[f]);
      parts.push(`"${f}" = ${val}`);
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