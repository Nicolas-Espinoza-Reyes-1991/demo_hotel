#!/bin/sh
# Libera espacio en el VPS antes de docker build (evita "no space left on device").
# Uso: sh scripts/vps-cleanup.sh
set -e

echo "=== Espacio en disco (antes) ==="
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "=== Limpiando caché Docker (imágenes/contenedores no usados) ==="
docker system prune -af --volumes=false 2>/dev/null || true
docker builder prune -af 2>/dev/null || true

echo ""
echo "=== Espacio en disco (después) ==="
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "Listo. Ahora ejecutá: cd /var/www/demo_hotel && sh scripts/deploy-site.sh"
