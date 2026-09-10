const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/explorer', require('./routes/explorer'));
app.use('/api/export', require('./routes/export'));
app.use('/api/health', require('./routes/health'));
app.use('/api/settings', require('./routes/settings'));
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

app.listen(config.PORT, () => {
  console.log(`Smart API démarrée sur http://localhost:${config.PORT}`);
  const source = require('./db').connectionSource();
  if (source.type === 'none') {
    console.warn('[config] Aucune connexion HFSQL configurée — configurez-la dans l\'interface (Paramètres).');
  } else {
    console.log(`[config] Connexion HFSQL : ${source.description}`);
  }
});
