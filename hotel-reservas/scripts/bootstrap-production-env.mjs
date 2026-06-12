#!/usr/bin/env node
/**
 * Genera hotel-reservas/.env.production en el VPS (no va en Git).
 * Uso en servidor:
 *   node scripts/bootstrap-production-env.mjs --force
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const target = join(root, ".env.production");
const force = process.argv.includes("--force");

const ENV_CONTENT = `# Generado por scripts/bootstrap-production-env.mjs — no commitear

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

HOTEL_NAME=Hotel Boye House
NEXT_PUBLIC_WHATSAPP_NUMBER=56900000000

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=CAMBIAR_RE_API_KEY
SMTP_FROM=Reservas Hotel Boye House <reservas@adkiniq.cl>
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
`;

function isStaleEnv(content) {
  return (
    content.includes("CAMBIAR_PASSWORD") ||
    content.includes("tuhotel.com") ||
    content.includes("reservas.tuhotel.com") ||
    content.includes("CAMBIAR_AUTH_SECRET")
  );
}

if (existsSync(target) && !force) {
  const current = readFileSync(target, "utf8");
  if (!isStaleEnv(current)) {
    console.log("[env] .env.production ya existe y parece válido. Usá --force para sobrescribir.");
    process.exit(0);
  }
  console.log("[env] .env.production obsoleto detectado — reemplazando…");
}

if (existsSync(target) && force) {
  const backup = `${target}.bak.${Date.now()}`;
  copyFileSync(target, backup);
  console.log(`[env] Backup: ${backup}`);
}

writeFileSync(target, ENV_CONTENT, "utf8");
console.log(`[env] Listo: ${target}`);
console.log("[env] Siguiente: docker-compose up -d --build");
