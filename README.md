# Smart — Explorateur de base HFSQL

Application web pour explorer et consulter les données d'une base **HFSQL** (PCSoft) via **ODBC**.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| BDD principale | HFSQL via ODBC (`odbc`) |
| BDD locale | SQLite (users, settings) |
| Auth | JWT + bcrypt |
| UI | TailwindCSS |
| CI/CD | GitHub Actions → Docker image |
| Déploiement | Docker Compose |

## Fonctionnalités

- **Explorateur auto de tables** — découvre les tables/colonnes via ODBC
- **Lecture dynamique** — pagination, tri, recherche en temps réel
- **Export CSV** — depuis l'explorateur
- **Auth JWT** — rôles admin/lecteur
- **Dashboard** — vue d'ensemble de la connexion ODBC
- **Paramètres** — configuration de la connexion HFSQL (admin) + profil utilisateur

## Configuration de la connexion HFSQL

La connexion vers la base HFSQL se configure **depuis l'interface web** (menu **Paramètres**, réservé à l'admin) :

- **Serveur** : adresse de la base HFSQL Client/Serveur
- **Port** : port HFSQL (par défaut 4900)
- **Identifiant / mot de passe**
- **Base de données** (optionnel)
- **Nom du pilote ODBC** (doit correspondre au pilote installé)
- Bouton **"Tester la connexion"** avant d'enregistrer

La configuration est stockée localement et prioritaire sur la variable d'environnement `ODBC_CONNECTION_STRING`.

### Variable d'environnement alternative

```bash
# Port de l'API
APP_PORT=3001

# Secret JWT
JWT_SECRET=votre-secret

# Chaîne de connexion ODBC (alternative à la configuration UI)
ODBC_CONNECTION_STRING=Driver={PCSoft HFSQL Client Server};Host=192.168.1.100;UID=admin;PWD=password;DATABASE=MaBase

# Admin par défaut
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123
```

### À propos du pilote ODBC HFSQL

Le pilote HFSQL est un composant **propriétaire PCSoft** :
- Il n'est **pas** inclus dans l'image Docker (unixODBC l'est).
- **Windows** : installé avec WinDev/WebDev, visible dans l'Administrateur ODBC → Pilotes.
- **Linux** : le fichier `.so` du pilote doit être copié dans le conteneur (ex: volume) et déclaré dans `/etc/odbcinst.ini`.
- L'application Node doit tourner dans la même architecture (32/64 bits) que le pilote installé.

### Développement local

```bash
git clone https://github.com/Didier57/smart.git
cd smart
npm run install-all
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Docker

```bash
docker compose up -d
```

### GitHub Actions

L'image Docker est automatiquement construite et poussée vers `ghcr.io/didier57/smart:latest` lors de chaque push sur `main`.

## Login par défaut

- **Utilisateur:** `admin`
- **Mot de passe:** `admin123`

> Changez le mot de passe après la première connexion.
