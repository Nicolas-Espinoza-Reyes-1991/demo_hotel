import { addDays, format } from "date-fns";
import type { Page } from "@playwright/test";

/** Fechas futuras estables para evitar solapamiento con reservas del seed y otros E2E. */
export function e2eStayDates(offsetStart?: number, nights = 3) {
  const start = offsetStart ?? 45 + Math.floor(Math.random() * 60);
  const checkIn = format(addDays(new Date(), start), "yyyy-MM-dd");
  const checkOut = format(addDays(new Date(), start + nights), "yyyy-MM-dd");
  return { checkIn, checkOut, nights };
}

export function uniqueGuestEmail(label: string) {
  return `e2e.${label}.${Date.now()}@hotel-boye.test`;
}

/** Busca disponibilidad en la home con fechas y huéspedes. */
export async function searchAvailability(
  page: Page,
  options: { checkIn: string; checkOut: string; guests?: number }
) {
  await page.goto("/");
  await page.getByRole("heading", { name: /reserva tu refugio en futrono/i }).waitFor();

  await page.locator('input[type="date"]').nth(0).fill(options.checkIn);
  await page.locator('input[type="date"]').nth(1).fill(options.checkOut);
  await page.waitForTimeout(100);

  if (options.guests) {
    await page.getByLabel(/huéspedes/i).selectOption(String(options.guests));
  }

  const availabilityResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/availability") &&
      response.request().method() === "GET" &&
      response.ok(),
    { timeout: 30_000 }
  );
  await page.getByRole("button", { name: /buscar disponibilidad/i }).click();
  const availabilityResponse = await availabilityResponsePromise;
  const availability = (await availabilityResponse.json()) as { count?: number; rooms?: unknown[] };
  if ((availability.count ?? availability.rooms?.length ?? 0) === 0) {
    throw new Error(
      `Sin habitaciones para ${options.checkIn} → ${options.checkOut} (${options.guests ?? 2} huéspedes).`
    );
  }
  await page.getByRole("button", { name: /reservar ahora/i }).first().waitFor({ timeout: 15_000 });
}

/** Abre modal de reserva de la primera habitación visible. */
export async function openFirstRoomBooking(page: Page) {
  await page.getByRole("button", { name: /reservar ahora/i }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.getByText(/paso 1 de 2/i).waitFor();
}

/** Avanza al paso de pago y espera a que carguen los métodos disponibles. */
export async function fillGuestAndContinue(
  page: Page,
  guest: {
    fullName: string;
    email: string;
    phone?: string;
    birthDate?: string;
    rut?: string;
  }
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/nombre completo/i).fill(guest.fullName);
  await dialog.getByLabel(/^email$/i).fill(guest.email);
  await dialog.getByLabel(/teléfono móvil/i).fill(guest.phone ?? "+56911112222");
  await dialog.getByLabel(/fecha de nacimiento/i).fill(guest.birthDate ?? "1990-06-15");
  await dialog.getByPlaceholder(/12\.345\.678-9/i).fill(guest.rut ?? "12.345.678-5");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: /continuar al pago/i }).click();
  await dialog.getByText(/paso 2 de 2/i).waitFor({ timeout: 20_000 });
  await dialog
    .getByRole("button", { name: /^(pago online|transferencia)$/i })
    .first()
    .waitFor({ timeout: 20_000 });
}

/** Selecciona transferencia bancaria en el paso de pago. */
export async function selectBankTransferPayment(page: Page) {
  const dialog = page.getByRole("dialog");
  const transferTab = dialog.getByRole("button", { name: /^transferencia$/i });
  await transferTab.waitFor({ timeout: 20_000 });
  await transferTab.click();
  await dialog
    .getByRole("button", { name: /confirmar reserva con transferencia/i })
    .waitFor({ timeout: 15_000 });
}
