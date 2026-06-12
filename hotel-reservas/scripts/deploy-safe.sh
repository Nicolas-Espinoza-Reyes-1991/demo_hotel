#!/bin/sh
# Deploy de producción SIN borrar la base de datos.
# Uso: cd /var/www/demo_hotel/hotel-reservas && sh scripts/deploy-safe.sh
#
# NUNCA usa: docker-compose down -v  |  prisma db seed
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Deploy seguro (conserva postgres_data) ==="

if [ ! -f .env.production ]; then
  echo "[deploy] ERROR: falta .env.production"
  echo "[deploy] Crear una sola vez: sh scripts/bootstrap-production-env.sh"
  echo "[deploy] NO uses --force si ya tenés datos en producción."
  exit 1
fi

echo "[deploy] Backup antes de actualizar…"
sh scripts/backup-db.sh || echo "[deploy] AVISO: backup falló (¿db caída?). Continuando…"

echo "[deploy] Reconstruyendo solo la app…"
docker-compose up -d --build --no-deps app 2>/dev/null || {
  echo "[deploy] Recreate completo (sin borrar volumen)…"
  docker-compose down 2>/dev/null || true
  docker ps -aq --filter "name=hotel-reservas_app" | xargs -r docker rm -f 2>/dev/null || true
  docker-compose up -d --build
}

echo "[deploy] Migraciones (automáticas al iniciar app)…"
sleep 5
docker-compose logs --tail=20 app

echo ""
echo "=== Verificar ==="
curl -sf http://127.0.0.1:3000/reservas/api/health && echo "" || curl -sf http://127.0.0.1:3000/api/health && echo ""
echo ""
echo "Habitaciones:"
curl -sf http://127.0.0.1:3000/reservas/api/public/rooms 2>/dev/null | head -c 200 || curl -sf http://127.0.0.1:3000/api/public/rooms 2>/dev/null | head -c 200
echo ""
echo ""
echo "Si la BD quedó vacía (0 habitaciones), restaurar demo:"
echo "  docker-compose exec app npx prisma db seed   ← BORRA reservas, solo demo"
echo "Restaurar desde backup:"
echo "  cat backups/TU_ARCHIVO.sql | docker-compose exec -T db psql -U postgres hotel_reservas"
