import { test, expect } from "@playwright/test";
import {
  e2eStayDates,
  fillGuestAndContinue,
  openFirstRoomBooking,
  searchAvailability,
  uniqueGuestEmail,
} from "./helpers";

test.describe("Flujo E2E — reserva con pago simulado", () => {
  // Happy path completo: buscar → reservar → pagar con tarjeta demo → confirmación.
  test("buscar habitación, reservar y pagar con tarjeta simulada", async ({ page }) => {
    const { checkIn, checkOut } = e2eStayDates(75, 2);
    const guest = {
      fullName: "E2E Usuario Demo",
      email: uniqueGuestEmail("simulated"),
      phone: "+56911112222",
    };

    await searchAvailability(page, { checkIn, checkOut, guests: 2 });
    await openFirstRoomBooking(page);
    await fillGuestAndContinue(page, guest);

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/titular de la tarjeta/i).waitFor({ timeout: 20_000 });

    await dialog.getByLabel(/titular de la tarjeta/i).fill(guest.fullName);
    await dialog.getByLabel(/número de tarjeta/i).fill("4242424242424242");
    await dialog.getByLabel(/vencimiento/i).fill("12/30");
    await dialog.getByLabel(/^cvv$/i).fill("123");

    await dialog.getByRole("button", { name: /^pagar /i }).click();

    await expect(page.getByRole("heading", { name: /reserva confirmada/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/código de confirmación/i)).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();

    await page.getByRole("button", { name: /entendido/i }).click();
    await expect(page.getByRole("heading", { name: /reserva confirmada/i })).toBeHidden();
  });
});
