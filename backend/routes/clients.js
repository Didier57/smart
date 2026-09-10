const express = require('express');
const { requireAuth } = require('../auth');
const odbc = require('../db');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await odbc.query(
      'SELECT IDClient, ClientNom, ClientSite, ClientAdresse, ClientCP, ClientTelephone, ClientEmail, ClientContrat, ClientContratType, ClientDeleted FROM "Client"'
    );
    res.json(rows);
  } catch (err) {
    console.error('[clients] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
  }
});

module.exports = router;
