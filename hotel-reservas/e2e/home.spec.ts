import { test, expect } from "@playwright/test";

test.describe("Smoke E2E — página principal", () => {
  // La home carga el motor de reservas y el formulario de búsqueda.
  test("muestra el motor de reservas y navegación", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /reserva tu refugio en futrono/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /buscar disponibilidad/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /volver al sitio web/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mi reserva", exact: true })).toBeVisible();
  });
});
