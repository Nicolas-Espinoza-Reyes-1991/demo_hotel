#!/bin/sh
# Deploy completo: landing estática + motor de reservas (Docker).
# Ejecutar EN EL VPS como root:
#   cd /var/www/demo_hotel && sh scripts/deploy-site.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Deploy La Casona — landing + reservas ==="
echo "[deploy] Repo: $REPO_ROOT"

echo "[deploy] git pull…"
git pull origin main

ENV_FILE="$REPO_ROOT/hotel-reservas/.env.production"
if [ -f "$ENV_FILE" ]; then
  if grep -q 'HOTEL_NAME=Hotel Boye House' "$ENV_FILE" 2>/dev/null; then
    echo "[deploy] Actualizando HOTEL_NAME en .env.production…"
    sed -i 's/HOTEL_NAME=Hotel Boye House/HOTEL_NAME=La Casona de Futrono/' "$ENV_FILE"
  fi
  if grep -q 'SMTP_FROM=Reservas Hotel Boye House' "$ENV_FILE" 2>/dev/null; then
    sed -i 's/SMTP_FROM=Reservas Hotel Boye House/SMTP_FROM=Reservas La Casona de Futrono/' "$ENV_FILE"
  fi
else
  echo "[deploy] AVISO: no existe hotel-reservas/.env.production"
  echo "[deploy] Crear con: cd hotel-reservas && sh scripts/bootstrap-production-env.sh"
fi

echo "[deploy] Landing estática actualizada (nginx sirve este directorio)."
echo "[deploy] Reconstruyendo contenedor de reservas…"
cd "$REPO_ROOT/hotel-reservas"
sh scripts/deploy-safe.sh

echo ""
echo "=== Listo ==="
echo "Landing:  http://178.104.214.147/"
echo "Reservas: http://178.104.214.147/reservas/"
echo ""
echo "Verificá logo y nombre en /reservas/ (forzá recarga: Ctrl+Shift+R)."
