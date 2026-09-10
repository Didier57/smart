#!/bin/sh
set -eu

PACK_DIR="/opt/hfsql-odbc"
DRIVER_DIR="${PACK_DIR}/lib"
ODBCINST_INI="/etc/odbcinst.ini"

echo "[entrypoint] Démarrage de Smart..."

if [ -f "$ODBCINST_INI" ] && grep -q '^\[HFSQL\]' "$ODBCINST_INI" 2>/dev/null; then
  echo "[entrypoint] Driver ODBC HFSQL déjà enregistré."
else
  PACK=$(ls "$PACK_DIR"/*.zip 2>/dev/null | head -n 1 || true)
  if [ -n "$PACK" ]; then
    echo "[entrypoint] Installation du driver HFSQL depuis : $PACK"
    rm -rf "$DRIVER_DIR"
    mkdir -p "$DRIVER_DIR"
    unzip -q -o "$PACK" -d "$DRIVER_DIR"
    chmod -R +x "$DRIVER_DIR"
    # Détection du driver : nom du fichier variable selon la version du pack (wd290hfo64.so, wd310hfo64.so, ...)
    DRIVER_SO=$(ls "$DRIVER_DIR"/*hfo64.so 2>/dev/null | head -n 1 || ls "$DRIVER_DIR"/*hfo*.so 2>/dev/null | head -n 1 || true)
    if [ -n "$DRIVER_SO" ]; then
      {
        echo "[ODBC Drivers]"
        echo "HFSQL = Installed"
        echo ""
        echo "[HFSQL]"
        echo "Description = HFSQL ODBC Driver"
        echo "Driver = $DRIVER_SO"
      } > "$ODBCINST_INI"
      echo "[entrypoint] Driver enregistré : $DRIVER_SO -> $ODBCINST_INI"
    else
      echo "[entrypoint] ERREUR : aucun fichier *hfo*.so dans $DRIVER_DIR."
    fi
  else
    echo "[entrypoint] AVERTISSEMENT : aucune archive *.zip dans $PACK_DIR."
    echo "[entrypoint]   Déposez le pack ODBC HFSQL dans ./hfsql-odbc/ puis redémarrez."
  fi
fi

# Bibliothèques WinDev (wd*.so) au chargement
export LD_LIBRARY_PATH="${DRIVER_DIR}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

# Base SQLite locale (users/settings) : garantir qu'elle vit dans le volume
# monté sur /app/backend/data, même si la stack ne définit pas la variable.
if [ -z "${LOCAL_DB_PATH:-}" ]; then
  export LOCAL_DB_PATH="/app/backend/data/smart-local.db"
  echo "[entrypoint] LOCAL_DB_PATH non défini -> $LOCAL_DB_PATH"
else
  echo "[entrypoint] LOCAL_DB_PATH=$LOCAL_DB_PATH"
fi
mkdir -p "$(dirname "$LOCAL_DB_PATH")"

exec "$@"