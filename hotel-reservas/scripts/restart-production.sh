#!/bin/sh
# Reinicia el motor de reservas en el VPS y recarga nginx.
# Uso: cd /var/www/demo_hotel/hotel-reservas && sh scripts/restart-production.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"

cd "$ROOT"

if [ ! -f .env.production ]; then
  echo "[restart] Generando .env.production…"
  sh scripts/bootstrap-production-env.sh --force
fi

echo "[restart] Reconstruyendo contenedores (conserva postgres_data — NO usa -v)…"
sh scripts/backup-db.sh 2>/dev/null || echo "[restart] AVISO: no se pudo hacer backup (¿db caída?)"

docker-compose down 2>/dev/null || true

# docker-compose 1.29.x + Docker reciente: KeyError 'ContainerConfig' si queda un contenedor huérfano
docker ps -aq --filter "name=hotel-reservas" | xargs -r docker rm -f 2>/dev/null || true
docker rm -f hotel-reservas_app_1 hotel-reservas_db_1 2>/dev/null || true

docker-compose up -d --build --force-recreate --remove-orphans

echo "[restart] Esperando health…"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -sf http://127.0.0.1:3000/reservas/api/health >/dev/null 2>&1; then
    echo "[restart] OK — app responde en localhost:3000/reservas"
    break
  fi
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "[restart] OK — app responde en localhost:3000 (sin basePath)"
    break
  fi
  sleep 3
  if [ "$i" = "15" ]; then
    echo "[restart] ERROR — la app no respondió. Logs:"
    docker-compose logs --tail=50 app
    exit 1
  fi
done

if command -v nginx >/dev/null 2>&1; then
  if [ -f "$REPO/deploy/nginx/landing-ip.conf" ]; then
    sudo cp "$REPO/deploy/nginx/landing-ip.conf" /etc/nginx/sites-available/hotel-landing
    sudo ln -sf /etc/nginx/sites-available/hotel-landing /etc/nginx/sites-enabled/hotel-landing
    sudo rm -f /etc/nginx/sites-enabled/default
  fi
  sudo nginx -t
  sudo systemctl reload nginx
  echo "[restart] Nginx recargado."
fi

echo ""
echo "Verificar:"
echo "  curl -s http://127.0.0.1/reservas/api/health"
echo "  curl -s https://lacasonadefutrono.cl/reservas/api/health"
echo "  Admin: https://lacasonadefutrono.cl/reservas/login"
