import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdkinCredit } from "./AdkinCredit";

describe("AdkinCredit", () => {
  it("muestra enlace a AdkinIQ", () => {
    render(<AdkinCredit />);

    const link = screen.getByRole("link", { name: "AdkinIQ" });
    expect(link).toHaveAttribute("href", "https://www.adkiniq.cl");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/desarrollado por/i)).toBeInTheDocument();
  });
});
