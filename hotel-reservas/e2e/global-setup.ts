import { execSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  const cwd = path.resolve(__dirname, "..");
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/hotel_reservas?schema=public";

  const env = { ...process.env, DATABASE_URL: databaseUrl };

  if (process.env.E2E_SKIP_DB_RESET !== "true") {
    console.log("[e2e] Aplicando migraciones y seed de inventario demo...");
    execSync("npx prisma migrate deploy", { cwd, stdio: "inherit", env });
    execSync("npm run db:seed", { cwd, stdio: "inherit", env });
  }
}
