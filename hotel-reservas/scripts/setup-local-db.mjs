#!/usr/bin/env node
/**
 * Configura PostgreSQL local para desarrollo.
 * Requiere Docker Desktop activo.
 */
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

try {
  run("docker compose -f docker-compose.dev.yml up -d");
  console.log("[setup] Esperando PostgreSQL...");
  execSync("timeout /t 8 /nobreak >nul 2>&1 || sleep 8", { shell: true });
  run("npx prisma migrate deploy");
  run("npx prisma db seed");
  console.log("[setup] Listo. Ejecutá: npm run dev:clean");
} catch (error) {
  console.error("[setup] Error:", error instanceof Error ? error.message : error);
  console.error("¿Docker Desktop está corriendo?");
  process.exit(1);
}
