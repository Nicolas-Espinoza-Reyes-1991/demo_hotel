import { defineConfig, devices } from "@playwright/test";

// Puerto 3001 en local evita reutilizar el dev server de `:3000` (distinto .env).
const port = process.env.E2E_PORT ?? (process.env.CI ? "3000" : "3001");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: process.env.E2E_SKIP_GLOBAL_SETUP ? undefined : "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `${baseURL}/api/health`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "true",
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: port,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/hotel_reservas?schema=public",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret-minimum-32-characters-long",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
      ALLOW_SIMULATED_PAYMENT: "true",
      BANK_TRANSFER_ENABLED: "true",
      BANK_NAME: "Banco E2E Test",
      BANK_ACCOUNT_HOLDER: "Hotel Boye House E2E",
      BANK_ACCOUNT_NUMBER: "000111222333444",
      BANK_CONTACT_EMAIL: "e2e@hotel.test",
      MERCADOPAGO_ACCESS_TOKEN: "",
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: "",
      NEXT_PUBLIC_WEBSITE_URL: "http://localhost:5501/propuesta-7-casona-futrono.html",
    },
  },
});
