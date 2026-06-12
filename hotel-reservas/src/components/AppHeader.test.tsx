import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("@/lib/website", () => ({
  getWebsiteUrl: vi.fn(() => "http://localhost:5501/propuesta-7-casona-futrono.html"),
}));

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  // Happy path: muestra navegación principal y enlace al sitio web.
  it("renderiza enlace para volver al sitio web", () => {
    render(<AppHeader />);
    const backLinks = screen.getAllByRole("link", { name: /volver al sitio web/i });
    expect(backLinks[0]).toHaveAttribute("href", "http://localhost:5501/propuesta-7-casona-futrono.html");
    cleanup();
  });

  // Navegación interna del módulo de reservas.
  it("renderiza links de Reservar y Mi reserva", () => {
    render(<AppHeader />);
    expect(screen.getAllByRole("link", { name: /^Reservar$/i })[0]).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: /^Mi reserva$/i })[0]).toHaveAttribute("href", "/mi-reserva");
    cleanup();
  });

  it("muestra botón de menú móvil", () => {
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: /abrir menú/i })).toBeTruthy();
    cleanup();
  });
});
