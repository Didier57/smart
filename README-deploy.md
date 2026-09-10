# Smart — Guide de déploiement et installation du driver ODBC HFSQL

Documentation PCSoft de référence : https://doc.pcsoft.fr/fr-FR/?9000160

> **Point important** : le driver ODBC HFSQL de PCSoft est un composant **propriétaire**.
> Le pack n'est **pas** committé dans le dépôt public ni inclus dans l'image GitHub Actions.
> Il est à déposer sur le serveur ; son installation dans le conteneur est **automatique**.

---

## 1. Cas Windows (développement local)

Sous Windows, le driver ODBC HFSQL est installé **avec WinDev / WebDev / WINDEV Mobile**.

1. Installez WinDev/WebDev (le driver ODBC est installé avec le produit).
2. Vérifiez sa présence : `Outil système` → `Administrateur ODBC` → onglet **Pilotes**.
   Le nom le plus courant est **`HFSQL ODBC Driver`**.
3. Dans l'application Smart (Paramètres), renseignez ce **nom de pilote** + Serveur, Port, UID, PWD, Base, puis **Tester la connexion**.

> Vérifiez que Node.js tourne dans la même architecture (32/64 bits) que le driver installé.

---

## 2. Cas Linux / Docker (NAS Synology, etc.)

### 2a. Récupérer le pack du driver

Le driver Linux est distribué uniquement avec WinDev/WebDev/WINDEV Mobile, dans le
répertoire `INSTALL\ODBC` (par ex. `wxpackodbclinux64.zip` ou `ODBC2024LINUX64PACK...zip`).

Copiez l'archive sur le serveur, dans le dossier `./hfsql-odbc/` à côté du `docker-compose.yml` :

```bash
mkdir -p hfsql-odbc
cp ODBC2024LINUX64PACK....zip hfsql-odbc/
```

### 2b. Installation automatique au démarrage

Le conteneur (`entrypoint`) installe le driver **tout seul** au premier démarrage :

1. Détecte une archive `*.zip` dans `/opt/hfsql-odbc` (le volume `./hfsql-odbc`);
2. L'extrait dans `/opt/hfsql-odbc/lib`;
3. Détecte automatiquement le driver (`*hfo64.so`, nom variable selon la version du pack)
   et enregistre la section **`[HFSQL]`** directement dans `/etc/odbcinst.ini`;
4. Expose `/opt/hfsql-odbc/lib` via `LD_LIBRARY_PATH` (les `wd*.so` WinDev).

Il suffit ensuite, dans l'application (Paramètres), de renseigner :
**Nom du pilote** = `HFSQL`, **Serveur** (IP de la base HFSQL), **Port** (défaut 4900),
**UID / mot de passe** et éventuellement **Base**, puis **Tester la connexion**.

> Les mots-clés envoyés par l'application sont ceux attendus par le driver HFSQL
> (`Server Name`, `Server Port`, `DATABASE`, `UID`, `PWD`) — d'autres clés comme
> `Host=`/`Port=` provoquent un crash du driver.

Vérification dans le conteneur :
```bash
docker compose exec smart bash
cat /etc/odbcinst.ini        # doit contenir la section [HFSQL]
ls /opt/hfsql-odbc/lib       # contient wd290hfo64.so + les bibliothèques WinDev
```

### 2c. Alternative : DSN dans ~/.odbc.ini

Créer/modifier `~/.odbc.ini` dans le conteneur (racine : `/root/.odbc.ini`) :

```
[ODBC Data Sources]
MaSourceODBC = HFSQL

[MaSourceODBC]
Server Name = 192.168.1.100
Server Port = 4900
Database = MaBase
UID = utilisateur
PWD = motdepasse
```

Test en ligne de commande :
```bash
iodbctest "DSN=MaSourceODBC"
```

Puis renseignez dans Smart (Paramètres) le champ **Source de données (DSN)** avec
`MaSourceODBC` et cliquez **Tester la connexion**.

> **Note ODBC** : node-odbc (package `odbc`) est lié à unixODBC, le driver Linux PCSoft
> s'enregistre auprès d'iODBC, mais les deux managers partagent `/etc/odbcinst.ini`.
> En cas d'échec, pointez le **Nom du pilote** directement sur le fichier `.so`
> (ex : `/opt/hfsql-odbc/lib/wd290hfo64.so`) avec les champs Serveur/Port/UID/PWD.

---

## 3. Déploiement Docker (NAS)

```bash
# 1. Préparer le pack du driver (voir 2a)
mkdir -p hfsql-odbc data
cp <pack-hfsql>.zip hfsql-odbc/

# 2. Fichier .env à côté du docker-compose.yml
#    JWT_SECRET=une-longue-cle-secrete

# 3. Démarrer
docker compose up -d
docker compose pull && docker compose up -d --force-recreate
```

Application accessible sur `http://<ip-nas>:3001`.

Login par défaut : `admin / admin123` (à changer après la première connexion).