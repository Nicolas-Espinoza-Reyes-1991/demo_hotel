import { test, expect } from "@playwright/test";
import {
  e2eStayDates,
  fillGuestAndContinue,
  openFirstRoomBooking,
  searchAvailability,
  selectBankTransferPayment,
  uniqueGuestEmail,
} from "./helpers";

test.describe("Flujo E2E — reserva con transferencia bancaria", () => {
  // Happy path: reserva pendiente de pago por transferencia con instrucciones bancarias.
  test("buscar habitación y registrar pago por transferencia", async ({ page, request }) => {
    const configRes = await request.get("/api/payments/config");
    expect(configRes.ok()).toBeTruthy();
    const paymentConfig = await configRes.json();
    expect(paymentConfig.bankTransfer?.enabled).toBe(true);
    const bankName = paymentConfig.bankTransfer!.bankName as string;

    const { checkIn, checkOut } = e2eStayDates(90, 3);
    const guest = {
      fullName: "E2E Transferencia Test",
      email: uniqueGuestEmail("transfer"),
    };

    await searchAvailability(page, { checkIn, checkOut, guests: 2 });
    await openFirstRoomBooking(page);
    await fillGuestAndContinue(page, guest);
    await selectBankTransferPayment(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(bankName)).toBeVisible();
    await dialog.getByRole("button", { name: /confirmar reserva con transferencia/i }).click();

    await expect(page.getByRole("heading", { name: /reserva registrada/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/pendiente · transferencia/i)).toBeVisible();
    await expect(page.getByText(/datos para transferir/i)).toBeVisible();
  });
});
