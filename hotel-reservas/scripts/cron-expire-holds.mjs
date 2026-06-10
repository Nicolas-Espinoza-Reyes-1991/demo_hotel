#!/usr/bin/env node
/**
 * Llama al endpoint de expiración de holds (para cron del sistema).
 * Uso: node scripts/cron-expire-holds.mjs
 */
const baseUrl = process.env.APP_URL?.trim() || "http://localhost:3000";
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("[cron] CRON_SECRET no configurado.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/cron/expire-holds`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await response.json().catch(() => ({}));
console.log("[cron]", response.status, body);

if (!response.ok) process.exit(1);
