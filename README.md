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

- **Source de données (DSN)** : mode documenté par PCSoft sous Linux (prioritaire)
- **Serveur** : adresse de la base HFSQL Client/Serveur
- **Port** : port HFSQL (par défaut 4900)
- **Identifiant / mot de passe**
- **Base de données** (optionnel)
- **Nom du pilote ODBC** (ou chemin du `.so` sous Linux)
- Bouton **"Tester la connexion"** avant d'enregistrer

La configuration est stockée localement et prioritaire sur la variable d'environnement `ODBC_CONNECTION_STRING`.

### Variable d'environnement alternative

```bash
# Port de l'API
APP_PORT=3001

# Secret JWT
JWT_SECRET=votre-secret

# Chaîne de connexion ODBC (alternative à la configuration UI)
ODBC_CONNECTION_STRING=Driver={HFSQL};Host=192.168.1.100;UID=admin;PWD=password;DATABASE=MaBase

# Admin par défaut
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123
```

### À propos du pilote ODBC HFSQL

Le pilote HFSQL est un composant **propriétaire PCSoft** (nom du pilote Linux : **`HFSQL`**) :
- Il n'est **jamais** committé dans le dépôt (repo public) — son pack est à déposer dans `./hfsql-odbc/` sur le serveur.
- **Windows** : installé avec WinDev/WebDev, visible dans l'Administrateur ODBC → Pilotes (nom usuel `HFSQL ODBC Driver`).
- **Linux/Docker** : `docker-entrypoint.sh` installe le driver **automatiquement** au démarrage à partir du pack `*.zip` monté dans `/opt/hfsql-odbc` (extraction + `install.sh` → enregistrement `[HFSQL]` dans `/etc/odbcinst.ini`).
- L'application Node doit tourner dans la même architecture (32/64 bits) que le pilote installé.

Consultez **`README-deploy.md`** pour les étapes complètes d'installation du driver (Windows et Linux/Docker).

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
