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
    const backLink = screen.getByRole("link", { name: /volver al sitio web/i });
    expect(backLink).toHaveAttribute("href", "http://localhost:5501/propuesta-7-casona-futrono.html");
    cleanup();
  });

  // Navegación interna del módulo de reservas.
  it("renderiza links de Reservar y Mi reserva", () => {
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: /^Reservar$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /^Mi reserva$/i })).toHaveAttribute("href", "/mi-reserva");
    cleanup();
  });
});
