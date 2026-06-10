import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WhatsAppSupport } from "./WhatsAppSupport";

vi.mock("@/lib/whatsapp", () => ({
  buildWhatsAppUrl: vi.fn((msg: string) => `https://wa.me/56912345678?text=${encodeURIComponent(msg)}`),
  buildReservationWhatsAppMessage: vi.fn(() => "Mensaje de prueba"),
}));

describe("WhatsAppSupport", () => {
  // Happy path: variant banner con enlace de contacto.
  it("renderiza banner con enlace a WhatsApp", () => {
    render(<WhatsAppSupport variant="banner" />);
    const link = screen.getByRole("link", { name: /contactar ahora/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(link).toHaveAttribute("target", "_blank");
    cleanup();
  });

  // Variant compact incluye enlace de soporte.
  it("renderiza variant compact", () => {
    render(<WhatsAppSupport variant="compact" confirmationCode="ABC123" />);
    const link = screen.getByRole("link", { name: /contáctanos/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    cleanup();
  });

  // Variant floating con aria-label accesible.
  it("renderiza botón flotante accesible", () => {
    render(<WhatsAppSupport variant="floating" />);
    expect(
      screen.getByRole("link", { name: /contactar por whatsapp/i })
    ).toBeInTheDocument();
    cleanup();
  });
});
