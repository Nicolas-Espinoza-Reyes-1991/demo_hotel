import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { GET } from "./route";

const params = { params: Promise.resolve({ file: "foto.jpg" }) };

describe("GET /boye-fotos/[file]", () => {
  // Happy path: sirve imagen JPEG.
  it("retorna imagen JPEG con cache headers", async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-image"));
    const response = await GET(new NextRequest("http://localhost"), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toContain("max-age");
  });

  // Edge case: extensión no permitida.
  it("rechaza extensiones no permitidas", async () => {
    const badParams = { params: Promise.resolve({ file: "script.exe" }) };
    const response = await GET(new NextRequest("http://localhost"), badParams);
    expect(response.status).toBe(400);
  });

  // Edge case: archivo inexistente.
  it("retorna 404 si la imagen no existe", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
    const response = await GET(new NextRequest("http://localhost"), params);
    expect(response.status).toBe(404);
  });
});
