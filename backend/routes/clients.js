const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');
const odbc = require('../db');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await odbc.query(
      'SELECT IDClient, ClientNom, ClientSite, ClientAdresse, ClientCP, ClientTelephone, ClientEmail, ClientContrat, ClientContratType, ClientDeleted, IDContract FROM "Client"'
    );
    res.json(rows);
  } catch (err) {
    console.error('[clients] GET / error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
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
    const textFields = ['ClientNom', 'ClientSite', 'ClientAdresse', 'ClientCP', 'ClientTelephone', 'ClientEmail', 'ClientContrat', 'ClientContratType'];
    const numFields = ['ClientDeleted', 'IDContract'];
    for (const f of textFields) {
      if (b[f] !== undefined) parts.push(`"${f}" = ${esc(b[f])}`);
    }
    for (const f of numFields) {
      if (b[f] !== undefined) parts.push(`"${f}" = ${num(b[f])}`);
    }
    if (parts.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier' });
    await odbc.query(`UPDATE "Client" SET ${parts.join(', ')} WHERE IDClient = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[clients] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du client: ' + err.message });
  }
});

module.exports = router;
