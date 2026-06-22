#!/bin/sh
# Deploy de producción SIN borrar la base de datos.
# Uso: cd /var/www/demo_hotel/hotel-reservas && sh scripts/deploy-safe.sh
#
# NUNCA usa: docker compose down -v  |  prisma db seed
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DC="sh scripts/dc.sh"

echo "=== Deploy seguro (conserva postgres_data) ==="

if [ ! -f .env.production ]; then
  echo "[deploy] ERROR: falta .env.production"
  echo "[deploy] Crear una sola vez: sh scripts/bootstrap-production-env.sh"
  echo "[deploy] NO uses --force si ya tenés datos en producción."
  exit 1
fi

echo "[deploy] Backup antes de actualizar…"
sh scripts/backup-db.sh || echo "[deploy] AVISO: backup falló (¿db caída?). Continuando…"

echo "[deploy] Reconstruyendo imagen app (sin caché de build anterior)…"
$DC build --no-cache app

echo "[deploy] Reiniciando solo la app…"
$DC up -d --no-deps app 2>/dev/null || {
  echo "[deploy] Recreate completo (sin borrar volumen)…"
  $DC down 2>/dev/null || true
  docker ps -aq --filter "name=hotel-reservas" | xargs -r docker rm -f 2>/dev/null || true
  $DC up -d --build
}

echo "[deploy] Esperando arranque…"
sleep 8
$DC logs --tail=30 app

echo ""
echo "=== Verificar ==="
curl -sf http://127.0.0.1:3000/reservas/api/health && echo "" || curl -sf http://127.0.0.1:3000/api/health && echo ""
echo ""
echo "Habitaciones:"
curl -sf http://127.0.0.1:3000/reservas/api/public/rooms 2>/dev/null | head -c 200 || curl -sf http://127.0.0.1:3000/api/public/rooms 2>/dev/null | head -c 200
echo ""
echo ""
echo "Si la BD quedó vacía (0 habitaciones), restaurar demo:"
echo "  sh scripts/dc.sh exec app npx prisma db seed   ← BORRA reservas, solo demo"
