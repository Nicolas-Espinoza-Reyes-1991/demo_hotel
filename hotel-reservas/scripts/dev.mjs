import { execSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const port = process.env.PORT ?? "3000";
const clean = process.argv.includes("--clean");

function freePort(targetPort) {
  if (process.platform === "win32") {
    try {
      execSync(
        `$processIds = Get-NetTCPConnection -LocalPort ${targetPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }`,
        { stdio: "ignore", shell: "powershell.exe" }
      );
    } catch {
      // puerto libre o sin permisos
    }
    return;
  }

  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9 2>/dev/null || true`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // ignore
  }
}

if (clean && existsSync(".next")) {
  rmSync(".next", { recursive: true, force: true });
  console.log("[dev] Caché .next eliminada.");
}

freePort(port);
console.log(`[dev] Iniciando en http://localhost:${port}`);

const child = spawn("npx", ["next", "dev", "-p", port], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
