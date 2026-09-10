# Instructions projet Smart — Explorateur HFSQL

## Stack
- Frontend: React 18 + Vite + TailwindCSS (port 5173) dans `frontend/`
- Backend: Node.js + Express (port 3001) dans `backend/`
- BDD locale (users/settings): SQLite via better-sqlite3 (`backend/smart-local.db`)
- BDD principale: HFSQL via ODBC (package `odbc`) — connexion configurable dans l'interface (Paramètres, admin) ou via `ODBC_CONNECTION_STRING`
- Auth: JWT + bcrypt (rôles: `admin`, `lecteur`)
- UI: TailwindCSS

## Commandes utiles

- Lancer les deux serveurs: `npm run dev` (à la racine)
- Backend seul: `node backend/server.js` (dans backend/)
- Frontend seul: `npm run dev --prefix frontend`
- Build frontend: `npm run build --prefix frontend`
- Installer les dépendances: `npm run install-all`

## Notes
- PowerShell bloque les scripts .ps1 → toujours utiliser `npm.cmd` plutôt que `npm` en shell
- Le backend tourne en deux modes: avec ODBC (exploration de tables HFSQL) ou sans (seul login possible)
- Les users/settings sont stockés en SQLite local (`smart-local.db`), la base HFSQL est en lecture seule via ODBC
- Compte admin par défaut: `admin / admin123`
- L'explorateur découvre automatiquement les tables/colonnes via `odbc.tables()` et `odbc.columns()`
- La connexion HFSQL se configure dans **Paramètres** (admin) : serveur (hôte), port, identifiant, mot de passe, base, nom du pilote ODBC OU **DSN** + bouton "Tester la connexion". Le mot de passe est stocké localement (SQLite) et masqué dans l'UI. La config est prioritaire sur `ODBC_CONNECTION_STRING`. Un DSN renseigné est prioritaire sur les champs serveur/pilote.
- Le pilote ODBC HFSQL (PCSoft) est **propriétaire** : son pack (`*.zip` Linux) ne doit **jamais** être committé dans le repo public (`.gitignore` : `hfsql-odbc/`). L'utilisateur le dépose dans `./hfsql-odbc/` ; `docker-entrypoint.sh` l'installe **automatiquement** au démarrage du conteneur (dézippage dans `/opt/hfsql-odbc/lib` + `./install.sh` qui enregistre le pilote **`HFSQL`** dans `/etc/odbcinst.ini`, partagé par iODBC et unixODBC) et positionne `LD_LIBRARY_PATH` (libs `wd290*.so` WinDev).
  - Windows : driver installé avec WinDev/WebDev, voir Administrateur ODBC → Pilotes (nom usuel `HFSQL ODBC Driver`).
  - Linux : pilote par défaut dans l'app = `HFSQL`. L'image contient unixODBC (+dev), iODBC (GTK, pour iodbctest), unzip — PAS libiodbc2-dev (conflit Debian avec unixodbc-dev) ; `iodbc-config` est fourni par un shim dans l'entrypoint (renvoie /etc/odbcinst.ini).
  - Mots-clés de connexion imposés par le driver : `Server Name` / `Server Port` / `DATABASE` / `UID` / `PWD`. Des clés inconnues (`Host=`, `Port=`, `Server=`) **crash** le driver (core dump) — vérifié dans un chroot Debian bookworm via iodbctest. `Database=` est **obligatoire** (sans base : erreur driver S1000 « chaîne de connexion insuffisante ») — le endpoint de test renvoie un message clair quand la base manque.
  - L'erreur ODBC réelle est exposée via `err.odbcErrors` (`formatOdbcError` dans `backend/db.js`) — ne JAMAIS se contenter de `err.message` (générique `[odbc] Error connecting...`).
  - Réf. PCSoft : https://doc.pcsoft.fr/fr-FR/?9000160
  - Node doit tourner dans la même architecture (32/64 bits) que le pilote.

## Architecture
- `backend/db.js` — Connexion/pool ODBC (relié à HFSQL), résolution de chaîne depuis les settings ou l'env
- `backend/db-local.js` — SQLite local (users, settings)
- `backend/settings.js` — lecture/écriture des réglages + construction de la chaîne ODBC (DSN ou Driver/Server/UID/PWD)
- `backend/routes/settings.js` — GET/PUT `/api/settings/hfsql` + POST `/api/settings/hfsql/test`
- `backend/routes/explorer.js` — CRUD read-only sur les tables HFSQL
- `backend/routes/export.js` — Export CSV des tables
- `backend/routes/auth.js` — Login JWT + profil
- `frontend/src/pages/Explorer.jsx` — Explorateur interactif de tables
- `frontend/src/pages/Settings.jsx` — Connexion HFSQL (admin, mode DSN ou champs) + profil
- `README-deploy.md` — déploiement et installation du driver ODBC HFSQL (automatique via `docker-entrypoint.sh` depuis `./hfsql-odbc/*.zip`)
- `docker-entrypoint.sh` — installe le driver HFSQL au démarrage si absent, expose `LD_LIBRARY_PATH`

## Déploiement
- Après les tests locaux: `git add -A && git commit -m "..." && git push` sur `main`.
- GitHub Actions construit l'image `ghcr.io/didier57/smart:latest`.
- Le serveur: `docker compose pull && docker compose up -d --force-recreate`.
- Variable requise: `JWT_SECRET`. La connexion HFSQL se fait via l'interface.
