# Smart — Guide de déploiement et installation du driver ODBC HFSQL

Documentation PCSoft de référence : https://doc.pcsoft.fr/fr-FR/?9000160

> **Point important** : le driver ODBC HFSQL de PCSoft est un composant **propriétaire**.
> Il n'est **pas** inclus dans l'image Docker et son installation ne peut pas être automatisée.
> Seuls les managers ODBC (unixODBC pour node-odbc, iODBC requis par le driver Linux) sont inclus.

---

## 1. Cas Windows (développement local)

Sous Windows, le driver ODBC HFSQL est installé **avec WinDev / WebDev / WINDEV Mobile** (ou son installeur).

1. Installez WinDev/WebDev (le driver ODBC est installé avec le produit).
2. Vérifiez sa présence : `Outil système` → `Administrateur ODBC` → onglet **Pilotes**.
   - Le nom exact du pilote s'affiche dans la liste (ex : `PCSoft HFSQL Client Server`).
3. Dans l'application Smart (Paramètres), renseignez ce **nom de pilote** + Serveur, Port, UID, PWD, Base, puis **Tester la connexion**.

> Vérifiez que Node.js tourne dans la même architecture (32/64 bits) que le driver installé.

---

## 2. Cas Linux / Docker (NAS Synology, etc.)

Le driver Linux est distribué uniquement avec WinDev/WebDev/WINDEV Mobile, dans
le répertoire `INSTALL\ODBC` sous forme d'archive `wxpackodbclinux64.zip`.

### 2a. Récupérer le driver

Sur le poste où WinDev (ou WebDev/WinDev Mobile) est installé, copiez
`wxpackodbclinux64.zip` depuis le sous-répertoire `INSTALL\ODBC`.

### 2b. Installation manuelle dans le conteneur

1. Montez l'archive dans le conteneur (volume `./hfsql-odbc:/opt/hfsql-odbc`).
   Placez `wxpackodbclinux64.zip` dans le dossier hôte `./hfsql-odbc/`.
2. Connectez-vous dans le conteneur :
   ```bash
   docker compose exec smart bash
   ```
3. Dézippez et lancez le script d'installation (enregistre le driver auprès d'iODBC) :
   ```bash
   cd /opt/hfsql-odbc
   unzip wxpackodbclinux64.zip -d hfo
   cd hfo
   ./install.sh          # ou : sudo ./install.sh   (./install.sh -help pour plus d'options)
   ```
   L'iODBC manager est déjà installé dans l'image (`iodbc`, `libiodbc2`).

### 2c. Configurer la source de données (DSN)

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

Ou via l'outil graphique iODBC (`iodbcadm-gtk`).

Test en ligne de commande :
```bash
iodbctest "DSN=MaSourceODBC"
```

### 2d. Brancher l'application

Dans Smart (Paramètres), renseignez le champ **Source de données (DSN)** avec
`MaSourceODBC`, puis cliquez **Tester la connexion**.

> **Note sur les managers ODBC** : node-odbc (le package `odbc`) est lié à **unixODBC**,
> tandis que le driver HFSQL Linux de PCSoft s'enregistre avec **iODBC**. Les deux managers
> lisent le fichier DSN `~/.odbc.ini` (spécification ODBC). Si la connexion échoue avec un
> DSN, essayez de pointer le champ **Nom du pilote** directement sur le fichier `.so`
> (ex : `/opt/hfsql-odbc/hfo/WD310hfo64.so`) avec les champs Serveur/Port/UID/PWD.

---

## 3. Déploiement Docker (NAS)

```bash
# Préparer le dossier du driver
mkdir -p hfsql-odbc
cp wxpackodbclinux64.zip hfsql-odbc/

# Variable d'environnement (fichier .env à côté du docker-compose.yml)
JWT_SECRET=une-longue-cle-secrete

# Démarrer
docker compose up -d
docker compose pull && docker compose up -d --force-recreate
```

Application accessible sur `http://<ip-nas>:3001`.

Login par défaut : `admin / admin123` (à changer après la première connexion).