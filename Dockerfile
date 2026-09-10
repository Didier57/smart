# Étape 1 : build du frontend React/Vite
FROM node:20-slim AS frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend ./frontend
RUN npm run build --prefix frontend

# Étape 1b : compilation du helper hfcli (pont iODBC).
# Le pilote ODBC HFSQL ne fonctionne qu'avec iODBC (node-odbc = unixODBC echoue :
# erreur corrompue "0 U"). Pas de conflit ici : ce stage ne contient pas
# unixodbc-dev (conflit Debian libiodbc2-dev <-> unixodbc-dev).
FROM debian:bookworm-slim AS hfcli-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    libiodbc2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY backend/hfcli/hfcli.c .
RUN mkdir -p /out && gcc -O2 -Wall -o /out/hfcli hfcli.c -I/usr/include/iodbc -liodbc

# Étape 2 : runtime Node (API + frontend buildé)
FROM node:20-slim AS runtime
WORKDIR /app

# Dépendances système ODBC :
# - unixodbc / unixodbc-dev : requis par node-odbc (dev pour compiler le module au besoin)
# - iodbc / libiodbc2      : manager requis par le driver ODBC HFSQL (PCSoft) sous Linux
#   NB : PAS de libiodbc2-dev -> il est en CONFLIT avec unixodbc-dev en Debian
#       (mêmes en-têtes ODBC). iodbc-config est fourni par l'entrypoint (shim).
# - unzip    : extraction du pack du driver au démarrage (entrypoint)
RUN apt-get update && apt-get install -y --no-install-recommends \
    unixodbc \
    unixodbc-dev \
    iodbc \
    libiodbc2 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend
COPY backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Helper iODBC (pont HFSQL) compilé à l'étape 1b
COPY --from=hfcli-build /out/hfcli /usr/local/bin/hfcli

# Entrypoint : installe le driver ODBC HFSQL (pack *.zip monté dans /opt/hfsql-odbc)
# puis prépare LD_LIBRARY_PATH pour les bibliothèques WinDev (wd290*.so).
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

ENV NODE_ENV=production
ENV PORT=3001
ENV TZ=Europe/Paris
ENV LD_LIBRARY_PATH=/opt/hfsql-odbc/lib
# Base SQLite locale (users/settings) : DOIT vivre dans le volume /app/backend/data
# même si la stack ne définit pas la variable (DockHand, etc.).
ENV LOCAL_DB_PATH=/app/backend/data/smart-local.db
EXPOSE 3001

WORKDIR /app/backend
CMD ["node", "server.js"]
