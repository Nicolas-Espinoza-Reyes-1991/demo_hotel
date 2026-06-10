import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { SESSION_COOKIE } from "@/lib/auth";

describe("POST /api/auth/logout", () => {
  // Happy path: limpia cookie de sesión.
  it("cierra sesión y expira cookie hotel_session", async () => {
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toMatch(/cerrada/i);
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
