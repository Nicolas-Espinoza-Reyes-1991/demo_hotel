#!/bin/sh
# Instala Docker Compose v2 (plugin oficial) — solución definitiva al bug:
#   KeyError: 'ContainerConfig'  (docker-compose 1.29.x + Docker Engine reciente)
#
# No requiere el repo apt de Docker. Descarga el binario oficial de GitHub.
# Uso en el VPS (como root o con sudo):
#   cd /var/www/demo_hotel/hotel-reservas
#   sh scripts/install-docker-compose-v2.sh
set -e

COMPOSE_VERSION="${COMPOSE_VERSION:-v2.32.4}"
PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"
PLUGIN_PATH="$PLUGIN_DIR/docker-compose"

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  aarch64|arm64) ARCH="aarch64" ;;
  *)
    echo "[compose] Arquitectura no soportada: $ARCH"
    exit 1
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "[compose] ERROR: Docker no está instalado."
  exit 1
fi

echo "[compose] Instalando Docker Compose $COMPOSE_VERSION ($ARCH)…"
sudo mkdir -p "$PLUGIN_DIR"
sudo curl -fsSL \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
  -o "$PLUGIN_PATH"
sudo chmod +x "$PLUGIN_PATH"

echo ""
docker compose version
echo ""
echo "[compose] Compose v2 instalado en: $PLUGIN_PATH"
echo ""
echo "Usar de ahora en adelante:"
echo "  docker compose up -d --build"
echo "  docker compose down"
echo "  docker compose ps"
echo "  docker compose logs -f app"
echo ""
echo "Opcional — quitar compose v1 (Python) para no confundirte:"
echo "  sudo apt remove -y docker-compose"
echo "  # o: sudo rm -f /usr/bin/docker-compose"
echo ""
echo "El bug ContainerConfig NO debería volver con Compose v2."
