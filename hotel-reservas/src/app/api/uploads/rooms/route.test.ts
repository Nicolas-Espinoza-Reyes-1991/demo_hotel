import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { mkdir, writeFile } from "fs/promises";

describe("POST /api/uploads/rooms", () => {
  // Happy path: sube imagen válida.
  it("sube imagen JPG y retorna URL pública", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "habitacion.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("file", file);

    const request = new NextRequest("http://localhost/api/uploads/rooms", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.url).toMatch(/^\/uploads\/rooms\//);
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
  });

  // Edge case: sin archivo.
  it("rechaza request sin archivo", async () => {
    const formData = new FormData();
    const request = new NextRequest("http://localhost/api/uploads/rooms", {
      method: "POST",
      body: formData,
    });
    expect((await POST(request)).status).toBe(400);
  });

  // Edge case: MIME no permitido.
  it("rechaza formato no permitido", async () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.set("file", file);

    const request = new NextRequest("http://localhost/api/uploads/rooms", {
      method: "POST",
      body: formData,
    });
    expect((await POST(request)).status).toBe(400);
  });
});
