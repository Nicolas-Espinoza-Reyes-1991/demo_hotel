#!/usr/bin/env node
/**
 * Backup de PostgreSQL usando pg_dump dentro del contenedor db.
 * Uso: node scripts/backup-db.mjs
 * Requiere: docker compose con servicio db activo.
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const backupDir = join(process.cwd(), "backups");
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(backupDir, `hotel_reservas_${stamp}.sql`);

const cmd = `docker compose exec -T db pg_dump -U postgres hotel_reservas > "${file}"`;

try {
  execSync(cmd, { stdio: "inherit", shell: true });
  console.log(`[backup] Guardado en ${file}`);
} catch {
  console.error("[backup] Error. ¿Está corriendo docker compose con el servicio db?");
  process.exit(1);
}
