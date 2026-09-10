const express = require('express');
const bcrypt = require('bcryptjs');
const dbLocal = require('../db-local');
const odbc = require('../db');
const { sign, requireAuth } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants manquants' });
  }

  const localUser = dbLocal.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (localUser) {
    if (!bcrypt.compareSync(password, localUser.password_hash)) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    if (localUser.active !== 1) {
      return res.status(401).json({ error: 'Compte désactivé — contactez un administrateur' });
    }
    return res.json({
      token: sign(localUser),
      user: { id: localUser.id, username: localUser.username, role: localUser.role, email: localUser.email }
    });
  }

  if (!odbc.canResolveConnectionString()) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  try {
    const safeUser = String(username).replace(/'/g, "''");
    const rows = await odbc.query(
      `SELECT IDUser, Username, UserPassword, UserNom, UserEmail, Adminfull, GestionClient, Deleted FROM "Users" WHERE Username = '${safeUser}'`
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const hf = rows[0];

    if (String(hf.UserPassword) !== password) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    if (hf.Deleted === '1' || hf.Deleted === 1) {
      return res.status(401).json({ error: 'Compte désactivé — contactez un administrateur' });
    }

    const role = (hf.Adminfull === '1' || hf.Adminfull === 1) ? 'admin' : 'lecteur';
    const gestionClient = hf.GestionClient === '1' || hf.GestionClient === 1;
    const tokenUser = {
      id: -hf.IDUser,
      username: String(hf.Username),
      role,
      source: 'hfsql',
      gestionClient
    };

    res.json({
      token: sign(tokenUser),
      user: {
        id: tokenUser.id,
        username: tokenUser.username,
        role: tokenUser.role,
        email: hf.UserEmail || null,
        nom: hf.UserNom || null,
        gestionClient
      }
    });
  } catch (err) {
    console.error('[auth] Erreur login HFSQL:', err.message);
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  if (req.user.source === 'hfsql') {
    return res.json({ id: req.user.id, username: req.user.username, role: req.user.role, gestionClient: req.user.gestionClient });
  }
  const user = dbLocal.prepare('SELECT id, username, role, email FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

router.put('/profile', requireAuth, (req, res) => {
  if (req.user.source === 'hfsql') {
    return res.status(403).json({ error: 'Profil géré côté HFSQL — modification non disponible ici' });
  }
  const user = dbLocal.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });

  const { username, email, currentPassword, newPassword } = req.body || {};

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
    }
  }

  let newUsername = user.username;
  let newEmail = user.email;

  if (username !== undefined) {
    const v = String(username).trim();
    if (!v) return res.status(400).json({ error: "Le nom d'utilisateur ne peut pas être vide" });
    if (v !== user.username) {
      const exists = dbLocal.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(v, user.id);
      if (exists) return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
    }
    newUsername = v;
  }

  if (email !== undefined) {
    newEmail = String(email).trim() || null;
  }

  if (newUsername !== user.username || newEmail !== user.email || newPassword) {
    dbLocal.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run(newUsername, newEmail, user.id);
    if (newPassword) {
      dbLocal.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
    }
  }

  res.json({ id: user.id, username: newUsername, role: user.role, email: newEmail });
});

module.exports = router;
