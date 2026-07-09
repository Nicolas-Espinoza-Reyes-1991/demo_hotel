import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus } from "@prisma/client";
import {
  buildContactMailSubject,
  buildReservationEmailPayload,
  isEmailNotificationsEnabled,
  sendReservationCreatedEmail,
  sendReservationPaidEmail,
} from "./email";

describe("email helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const reservation = {
    confirmationCode: "CONF-99",
    guestFullName: "Ana López",
    checkIn: new Date("2026-08-01T12:00:00.000Z"),
    checkOut: new Date("2026-08-04T12:00:00.000Z"),
    totalAmount: 450,
    paymentStatus: PaymentStatus.PENDING,
    room: { name: "Coihue" },
    guest: { fullName: "Ana López", email: "ana@example.com" },
  };

  // Happy path: buildReservationEmailPayload mapea campos clave.
  it("buildReservationEmailPayload formatea fechas y totales", () => {
    const payload = buildReservationEmailPayload(reservation);
    expect(payload.to).toBe("ana@example.com");
    expect(payload.confirmationCode).toBe("CONF-99");
    expect(payload.checkIn).toBe("2026-08-01");
    expect(payload.checkOut).toBe("2026-08-04");
    expect(payload.totalAmount).toBe(450);
  });

  // Sin SMTP en dev: no lanza y loguea demo.
  it("sendReservationCreatedEmail no lanza sin SMTP configurado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SMTP_HOST", "");
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(sendReservationCreatedEmail(buildReservationEmailPayload(reservation))).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
  });

  // sendReservationPaidEmail también tolera ausencia de SMTP.
  it("sendReservationPaidEmail no lanza sin SMTP configurado", async () => {
    vi.stubEnv("SMTP_HOST", "");
    await expect(
      sendReservationPaidEmail({
        ...buildReservationEmailPayload(reservation),
        paymentStatus: "PAID",
      })
    ).resolves.toBeUndefined();
  });

  it("isEmailNotificationsEnabled refleja configuración SMTP", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    expect(isEmailNotificationsEnabled()).toBe(false);

    vi.stubEnv("SMTP_HOST", "smtp.test.com");
    vi.stubEnv("SMTP_FROM", "Hotel <a@test.com>");
    expect(isEmailNotificationsEnabled()).toBe(true);
  });

  it("buildContactMailSubject incluye URGENTE, nombre y tipo únicos por envío", () => {
    const subject = buildContactMailSubject({
      name: "Nicolas Espinoza",
      email: "test@example.com",
      subject: "consulta",
      message: "Hola, necesito información",
    });
    expect(subject).toMatch(/^\[URGENTE\] Contacto · Consulta general · Nicolas Espinoza · /);
  });
});
