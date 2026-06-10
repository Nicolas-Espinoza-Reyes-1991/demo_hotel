import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/reservation-holds", () => ({
  expireStaleHoldReservations: vi.fn().mockResolvedValue(3),
}));

import { GET, POST } from "./route";
import { expireStaleHoldReservations } from "@/lib/reservation-holds";

describe("/api/cron/expire-holds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: cron autorizado expira holds.
  it("GET expira holds con Bearer CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const request = new NextRequest("http://localhost/api/cron/expire-holds", {
      headers: { authorization: "Bearer cron-test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.expired).toBe(3);
    expect(expireStaleHoldReservations).toHaveBeenCalled();
  });

  // Seguridad: sin autorización en producción.
  it("rechaza petición sin secret en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const response = await GET(new NextRequest("http://localhost/api/cron/expire-holds"));
    expect(response.status).toBe(401);
  });

  // POST delega en GET.
  it("POST delega la misma lógica que GET", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const request = new NextRequest("http://localhost/api/cron/expire-holds", {
      method: "POST",
      headers: { authorization: "Bearer cron-test-secret" },
    });
    expect((await POST(request)).status).toBe(200);
  });
});
