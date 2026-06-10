import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  // Happy path: muestra label por defecto según variant.
  it("renderiza label por defecto de variant paid", () => {
    render(<StatusBadge variant="paid" />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  // Permite label personalizado.
  it("renderiza label personalizado", () => {
    render(<StatusBadge variant="pending" label="Esperando pago" />);
    expect(screen.getByText("Esperando pago")).toBeInTheDocument();
  });

  // Variants de estado operativo de habitación.
  it("renderiza variant maintenance", () => {
    render(<StatusBadge variant="maintenance" />);
    expect(screen.getByText("Mantenimiento")).toBeInTheDocument();
  });
});
