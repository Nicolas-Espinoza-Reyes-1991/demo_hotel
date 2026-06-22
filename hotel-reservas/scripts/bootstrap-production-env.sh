#!/bin/sh
# Genera .env.production en el VPS (no requiere Node.js)
# Uso: sh scripts/bootstrap-production-env.sh --force
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/.env.production"
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
  esac
done

is_stale() {
  grep -qE 'CAMBIAR_PASSWORD|tuhotel\.com|reservas\.tuhotel\.com|CAMBIAR_AUTH_SECRET' "$1" 2>/dev/null
}

if [ -f "$TARGET" ] && [ "$FORCE" != "true" ]; then
  if ! is_stale "$TARGET"; then
    echo "[env] .env.production ya existe y parece válido. Usá --force para sobrescribir."
    exit 0
  fi
  echo "[env] .env.production obsoleto detectado — reemplazando…"
fi

if [ -f "$TARGET" ] && [ "$FORCE" = "true" ]; then
  BACKUP="$TARGET.bak.$(date +%s)"
  cp "$TARGET" "$BACKUP"
  echo "[env] Backup: $BACKUP"
fi

cat > "$TARGET" <<'EOF'
# Generado por scripts/bootstrap-production-env.sh — no commitear

NODE_ENV=production
APP_URL=http://178.104.214.147/reservas
NEXT_PUBLIC_WEBSITE_URL=http://178.104.214.147
NEXT_PUBLIC_BASE_PATH=/reservas
APP_PORT=3000
SESSION_COOKIE_SECURE=false

NEXT_PUBLIC_SHOW_DEMO_UI=false
NEXT_PUBLIC_DISPLAY_CURRENCY=CLP

DATABASE_URL=postgresql://postgres:BoyeDb2026Segura@db:5432/hotel_reservas?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=BoyeDb2026Segura
POSTGRES_DB=hotel_reservas

AUTH_SECRET=a7b01c58d432e5f6f6167d207ec32d126d6dba2956a37446ff5f3f05b8e3fd98
ADMIN_USERNAME=admin
ADMIN_PASSWORD=boye2026!

CRON_SECRET=6a6fe42a571fcd68f5c2427dcd13e40f5ad6aff11bedf6f9bac99587157efa8e
RESERVATION_HOLD_MINUTES=30

HOTEL_NAME=La Casona de Futrono
NEXT_PUBLIC_WHATSAPP_NUMBER=56900000000

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=CAMBIAR_RE_API_KEY
SMTP_FROM=Reservas La Casona de Futrono <reservas@adkiniq.cl>
SMTP_BCC=contacto@adkiniq.cl

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
BANK_CONTACT_EMAIL=reservas@adkiniq.cl
BANK_TRANSFER_DEADLINE_HOURS=48
BANK_TRANSFER_NOTES=Indica tu código de reserva en el concepto de la transferencia.

ALLOW_SIMULATED_PAYMENT=false
EOF

echo "[env] Listo: $TARGET"
echo "[env] Siguiente: docker-compose up -d --build"
