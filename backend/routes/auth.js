const express = require('express');
const bcrypt = require('bcryptjs');
const dbLocal = require('../db-local');
const { sign, requireAuth } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants manquants' });
  }
  const user = dbLocal.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  if (user.active !== 1) {
    return res.status(401).json({ error: 'Compte désactivé — contactez un administrateur' });
  }
  res.json({ token: sign(user), user: { id: user.id, username: user.username, role: user.role, email: user.email } });
});

router.get('/me', requireAuth, (req, res) => {
  const user = dbLocal.prepare('SELECT id, username, role, email FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

router.put('/profile', requireAuth, (req, res) => {
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
