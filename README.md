# Smart — Explorateur de base HFSQL

Application web pour explorer et consulter les données d'une base **HFSQL** (PCSoft) via **ODBC**.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| BDD principale | HFSQL via ODBC (`node-odbc`) |
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
- **Paramètres** — profil utilisateur, statut ODBC

## Configuration

### Variables d'environnement

```bash
# Port de l'API
APP_PORT=3001

# Secret JWT
JWT_SECRET=votre-secret

# Chaîne de connexion ODBC
ODBC_CONNECTION_STRING=Driver={PCSoft HFSQL};Host=192.168.1.100;UID=admin;PWD=password;DATABASE=MaBase

# Admin par défaut
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123
```

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
