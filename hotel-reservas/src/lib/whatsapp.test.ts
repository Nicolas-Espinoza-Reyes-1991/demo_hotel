import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReservationWhatsAppMessage, buildWhatsAppUrl, getWhatsAppNumber } from "./whatsapp";

describe("whatsapp helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: número por defecto sin env.
  it("getWhatsAppNumber usa default y elimina no-dígitos", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+54 9 11 1234-5678");
    expect(getWhatsAppNumber()).toBe("5491112345678");
  });

  // buildWhatsAppUrl codifica mensaje en query string.
  it("buildWhatsAppUrl genera enlace wa.me con texto codificado", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "56912345678");
    const url = buildWhatsAppUrl("Hola hotel");
    expect(url).toContain("https://wa.me/56912345678");
    expect(url).toContain(encodeURIComponent("Hola hotel"));
  });

  // buildReservationWhatsAppMessage incluye metadata de reserva.
  it("buildReservationWhatsAppMessage agrega código, nombre y habitación", () => {
    const message = buildReservationWhatsAppMessage({
      confirmationCode: "ABC123",
      guestName: "Juan",
      roomName: "Coihue",
    });
    expect(message).toContain("ABC123");
    expect(message).toContain("Juan");
    expect(message).toContain("Coihue");
  });
});
