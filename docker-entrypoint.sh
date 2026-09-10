#!/bin/sh
set -eu

PACK_DIR="/opt/hfsql-odbc"
DRIVER_DIR="${PACK_DIR}/lib"
ODBCINST_INI=$(iodbc-config --odbcinstini 2>/dev/null || echo "/etc/odbcinst.ini")

echo "[entrypoint] Démarrage de Smart..."

# 1) Driver ODBC HFSQL : installé une seule fois s'il n'est pas déjà enregistré.
if grep -q "^\[HFSQL\]" "$ODBCINST_INI" 2>/dev/null; then
  echo "[entrypoint] Driver ODBC HFSQL déjà enregistré ($ODBCINST_INI)."
else
  PACK=$(ls "$PACK_DIR"/*.zip 2>/dev/null | head -n 1 || true)
  if [ -n "$PACK" ]; then
    echo "[entrypoint] Installation du driver ODBC HFSQL depuis : $PACK"
    rm -rf "$DRIVER_DIR"
    mkdir -p "$DRIVER_DIR"
    unzip -q -o "$PACK" -d "$DRIVER_DIR"
    chmod +x "$DRIVER_DIR/install.sh"
    ( cd "$DRIVER_DIR" && ./install.sh "$DRIVER_DIR" )
    echo "[entrypoint] Driver ODBC HFSQL installé dans $DRIVER_DIR (nom pilote : HFSQL)."
  else
    echo "[entrypoint] AVERTISSEMENT : aucune archive *.zip dans $PACK_DIR."
    echo "[entrypoint]   Déposez le pack ODBC HFSQL dans ./hfsql-odbc/ puis redémarrez."
  fi
fi

# 2) Les bibliothèques WinDev (wd290*.so) doivent être trouvables au chargement.
export LD_LIBRARY_PATH="${DRIVER_DIR}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

exec "$@"