#!/bin/sh
# Configura SMTP / correo corporativo en .env.production (VPS).
# Uso en el servidor:
#   cd /var/www/demo_hotel
#   SMTP_PASS='re_...' sh scripts/configure-production-email.sh
#
# Requiere SMTP_PASS en el entorno (no commitear la API key).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/hotel-reservas/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[email] ERROR: no existe $ENV_FILE"
  echo "[email] Creá uno desde: cp hotel-reservas/.env.production.example hotel-reservas/.env.production"
  exit 1
fi

if [ -z "${SMTP_PASS:-}" ]; then
  echo "[email] ERROR: definí SMTP_PASS en el entorno."
  echo "[email] Ejemplo: SMTP_PASS='re_...' sh scripts/configure-production-email.sh"
  exit 1
fi

SMTP_HOST="${SMTP_HOST:-smtp.resend.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-resend}"
SMTP_FROM="${SMTP_FROM:-La Casona de Futrono <reservas@lacasonadefutrono.cl>}"
SMTP_BCC="${SMTP_BCC:-casonafutronoinformatica@gmail.com}"
CONTACT_INBOX_EMAIL="${CONTACT_INBOX_EMAIL:-casonafutronoinformatica@gmail.com}"
BANK_CONTACT_EMAIL="${BANK_CONTACT_EMAIL:-reservas@lacasonadefutrono.cl}"

set_var() {
  key="$1"
  value="$2"
  escaped=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

echo "[email] Actualizando $ENV_FILE …"
set_var SMTP_HOST "$SMTP_HOST"
set_var SMTP_PORT "$SMTP_PORT"
set_var SMTP_USER "$SMTP_USER"
set_var SMTP_PASS "$SMTP_PASS"
set_var SMTP_FROM "$SMTP_FROM"
set_var SMTP_BCC "$SMTP_BCC"
set_var CONTACT_INBOX_EMAIL "$CONTACT_INBOX_EMAIL"
set_var BANK_CONTACT_EMAIL "$BANK_CONTACT_EMAIL"

echo "[email] Variables SMTP actualizadas."
echo "[email] Reiniciando contenedor app…"
cd "$REPO_ROOT/hotel-reservas"
docker compose up -d --force-recreate app

echo "[email] Esperando arranque (8s)…"
sleep 8

echo "[email] Verificando emailEnabled…"
curl -sf "https://lacasonadefutrono.cl/reservas/api/payments/config" | head -c 400
echo ""
echo ""
echo "[email] Listo. Revisá logs: docker compose logs --tail=30 app"
