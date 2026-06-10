import { test, expect } from "@playwright/test";

test.describe("E2E — acceso admin", () => {
  // Login admin y acceso al panel de gestión.
  test("inicia sesión y accede al calendario", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel(/usuario/i).fill("admin");
    await page.getByLabel(/contraseña/i).fill("admin123");
    await page.getByRole("button", { name: /^ingresar$/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /gestión del hotel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^calendario$/i })).toBeVisible();
  });
});
