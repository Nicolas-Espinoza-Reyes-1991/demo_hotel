import { describe, expect, it } from "vitest";
import { handleApiError, jsonError, jsonOk } from "./api-response";

describe("api-response helpers", () => {
  // Happy path: jsonOk serializa datos con status 200.
  it("jsonOk devuelve JSON con status 200", async () => {
    const response = jsonOk({ ok: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  // jsonError incluye código y detalles opcionales.
  it("jsonError devuelve mensaje, status y code", async () => {
    const response = jsonError("Falló", 422, { field: "x" }, "VALIDATION");
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Falló");
    expect(body.code).toBe("VALIDATION");
    expect(body.details).toEqual({ field: "x" });
  });

  // handleApiError mapea Unique constraint a 409.
  it("handleApiError detecta Unique constraint de Prisma", async () => {
    const response = handleApiError(new Error("Unique constraint failed on the fields"));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("DUPLICATE");
  });

  // Errores genéricos retornan 500 INTERNAL.
  it("handleApiError retorna 500 para errores desconocidos", async () => {
    const response = handleApiError("string error");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL");
  });
});
