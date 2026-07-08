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

# Regenerar artefactos desde hotel.config.json (landing + config/tema del módulo).
# Garantiza que nada quede desincronizado aunque se haya editado el config sin regenerar.
if command -v node >/dev/null 2>&1; then
  echo "[deploy] Regenerando desde hotel.config.json…"
  node scripts/generate-landing.mjs
else
  echo "[deploy] AVISO: node no está en el host; se usan los artefactos ya versionados."
  echo "[deploy]        Si editaste hotel.config.json, regenerá en local y commiteá."
fi

ENV_FILE="$REPO_ROOT/hotel-reservas/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "[deploy] AVISO: no existe hotel-reservas/.env.production"
  echo "[deploy] Instancia nueva: usá  sh scripts/provision-vps.sh"
fi

echo "[deploy] Landing estática actualizada (nginx sirve este directorio)."
echo "[deploy] Reconstruyendo contenedor de reservas…"
cd "$REPO_ROOT/hotel-reservas"

AVAIL_KB="$(df -k / | awk 'NR==2 {print $4}')"
if [ "$AVAIL_KB" -lt 3145728 ] 2>/dev/null; then
  echo "[deploy] AVISO: quedan menos de 3 GB libres. Limpiando Docker…"
  sh scripts/vps-cleanup.sh
fi

sh scripts/deploy-safe.sh

# Backfill NO destructivo de fotos/treeName (idempotente). Rellena solo lo vacío,
# no borra habitaciones ni reservas. Asegura que la landing muestre el carrusel completo.
echo "[deploy] Backfill de fotos/treeName en habitaciones…"
sh scripts/dc.sh exec -T app npx tsx scripts/backfill-room-photos.ts \
  || echo "[deploy] AVISO: backfill no ejecutado (¿app aún arrancando?). Correlo a mano luego."

echo ""
echo "=== Listo ==="
echo "Landing:  https://lacasonadefutrono.cl/"
echo "Reservas: https://lacasonadefutrono.cl/reservas/"
echo ""
echo "Verificá logo y nombre en /reservas/ (forzá recarga: Ctrl+Shift+R)."
echo "Si cambiaste la landing, purgá la caché de Cloudflare."
