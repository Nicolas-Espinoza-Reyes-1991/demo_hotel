#!/bin/sh
# Provisión de una instancia NUEVA de hotel en un VPS limpio.
#
# Idempotente en lo importante: no sobreescribe .env.production si ya existe.
# Deriva los valores del hotel desde hotel.config.json (marca/URLs/contacto) y
# genera secretos aleatorios. Las credenciales de pago/SMTP quedan como CAMBIAR_*.
#
# Uso (en el VPS, dentro del repo clonado en /var/www/demo_hotel):
#   cd /var/www/demo_hotel && sh scripts/provision-vps.sh
#
# Requisitos: node, docker (compose v2), openssl. nginx se instala aparte (se
# imprimen los comandos al final).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Provisión de nueva instancia de hotel ==="

# ── 0. Prerrequisitos ────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1   || { echo "ERROR: falta Node.js (para el generador)."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: falta Docker."; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "ERROR: falta openssl (para secretos)."; exit 1; }

CONFIG="$REPO_ROOT/hotel.config.json"
[ -f "$CONFIG" ] || { echo "ERROR: no existe hotel.config.json"; exit 1; }

# ── 1. Leer valores del config (sin depender de jq) ──────────────────────────
val() { node -e "const c=require('$CONFIG');const p='$1'.split('.').reduce((o,k)=>o&&o[k],c);process.stdout.write(String(p==null?'':p))"; }
SITE_URL="$(val urls.site)"
RESERVAS_URL="$(val urls.reservas)"
HOTEL_NAME="$(val brand.name)"
WHATSAPP="$(val contact.whatsapp)"
EMAIL="$(val contact.email)"
DOMAIN="$(printf '%s' "$SITE_URL" | sed -E 's#^https?://##; s#/.*$##')"

echo "[provision] Hotel:   $HOTEL_NAME"
echo "[provision] Dominio: $DOMAIN"
echo "[provision] Sitio:   $SITE_URL"

# ── 2. Generar artefactos desde el config ────────────────────────────────────
echo "[provision] Generando landing + config/tema del módulo…"
node scripts/generate-landing.mjs

# ── 3. .env.production (solo si falta) ───────────────────────────────────────
ENV_FILE="$REPO_ROOT/hotel-reservas/.env.production"
if [ -f "$ENV_FILE" ]; then
  echo "[provision] .env.production ya existe; NO se toca."
else
  echo "[provision] Creando .env.production con secretos aleatorios…"
  AUTH_SECRET="$(openssl rand -hex 32)"
  CRON_SECRET="$(openssl rand -hex 32)"
  DB_PASS="$(openssl rand -hex 16)"
  cat > "$ENV_FILE" <<EOF
# Generado por scripts/provision-vps.sh — NO commitear. Completá los CAMBIAR_*.
NODE_ENV=production
APP_URL=$RESERVAS_URL
NEXT_PUBLIC_APP_URL=$SITE_URL
NEXT_PUBLIC_WEBSITE_URL=$SITE_URL
NEXT_PUBLIC_BASE_PATH=/reservas
APP_PORT=3000
SESSION_COOKIE_SECURE=true

NEXT_PUBLIC_SHOW_DEMO_UI=false
NEXT_PUBLIC_DISPLAY_CURRENCY=CLP

DATABASE_URL=postgresql://postgres:$DB_PASS@db:5432/hotel_reservas?schema=public&connection_limit=5&pool_timeout=20
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$DB_PASS
POSTGRES_DB=hotel_reservas

AUTH_SECRET=$AUTH_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CAMBIAR_ADMIN_PASSWORD

CRON_SECRET=$CRON_SECRET
RESERVATION_HOLD_MINUTES=30

# HOTEL_NAME y WHATSAPP también viven en hotel.config.json; acá quedan como override.
HOTEL_NAME=$HOTEL_NAME
NEXT_PUBLIC_WHATSAPP_NUMBER=$WHATSAPP

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=CAMBIAR_RE_API_KEY
SMTP_FROM=Reservas $HOTEL_NAME <$EMAIL>
SMTP_BCC=$EMAIL

NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=CAMBIAR_MP_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN=CAMBIAR_MP_ACCESS_TOKEN
MERCADOPAGO_CURRENCY=CLP
MERCADOPAGO_WEBHOOK_SECRET=CAMBIAR_MP_WEBHOOK_SECRET

BANK_TRANSFER_ENABLED=true
BANK_NAME=CAMBIAR_NOMBRE_BANCO
BANK_ACCOUNT_HOLDER=CAMBIAR_TITULAR_CUENTA
BANK_ACCOUNT_NUMBER=CAMBIAR_NUMERO_CUENTA
BANK_ACCOUNT_TYPE=Cuenta corriente CLP
BANK_CBU=CAMBIAR_CBU_O_CVU
BANK_ALIAS=CAMBIAR_ALIAS
BANK_CONTACT_EMAIL=$EMAIL
BANK_TRANSFER_DEADLINE_HOURS=48
BANK_TRANSFER_NOTES=Indica tu código de reserva en el concepto de la transferencia.

ALLOW_SIMULATED_PAYMENT=false
EOF
  echo "[provision] .env.production creado."
fi

# ── 4. Config de nginx (render desde plantilla) ──────────────────────────────
NGINX_TPL="$REPO_ROOT/deploy/nginx/hotel.conf.template"
NGINX_OUT="$REPO_ROOT/deploy/nginx/hotel.generated.conf"
if [ -f "$NGINX_TPL" ]; then
  sed "s/__DOMAIN__/$DOMAIN/g" "$NGINX_TPL" > "$NGINX_OUT"
  echo "[provision] Config nginx generada: $NGINX_OUT"
fi

# ── 5. Build + arranque de Docker ────────────────────────────────────────────
echo "[provision] Levantando Docker (build inicial)…"
cd "$REPO_ROOT/hotel-reservas"
sh scripts/dc.sh up -d --build

echo "[provision] Esperando arranque…"
sleep 10

# ── 6. Datos iniciales de habitaciones (BD nueva = vacía) ────────────────────
echo "[provision] Cargando habitaciones oficiales…"
sh scripts/dc.sh exec -T app npx tsx scripts/sync-casona-production-rooms.ts \
  || echo "[provision] AVISO: sync no ejecutado; correlo a mano cuando la app esté arriba."

# ── 7. Siguientes pasos manuales ─────────────────────────────────────────────
echo ""
echo "=== Provisión completada ==="
echo "Landing:  $SITE_URL/   Reservas: $RESERVAS_URL/"
echo ""
echo "PENDIENTE (manual):"
echo "  1) Completar credenciales CAMBIAR_* en hotel-reservas/.env.production y reiniciar:"
echo "       cd hotel-reservas && sh scripts/deploy-safe.sh"
echo "  2) Instalar nginx (una vez):"
echo "       sudo apt update && sudo apt install -y nginx"
echo "       sudo cp $NGINX_OUT /etc/nginx/sites-available/hotel"
echo "       sudo ln -sf /etc/nginx/sites-available/hotel /etc/nginx/sites-enabled/"
echo "       sudo rm -f /etc/nginx/sites-enabled/default"
echo "       sudo nginx -t && sudo systemctl reload nginx && sudo ufw allow 80,443/tcp"
echo "  3) HTTPS: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  4) Reemplazar logo (assets/logo-casona.*) y foto OG por las del hotel."
echo "  5) Personalizar habitaciones (editar sync-casona-production-rooms.ts o el panel admin)."
