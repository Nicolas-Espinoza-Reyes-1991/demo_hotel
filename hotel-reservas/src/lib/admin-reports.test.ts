import { describe, expect, it } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { buildAdminReports, countOverlapNights, toCsv } from "./admin-reports";

describe("countOverlapNights", () => {
  it("cuenta noches dentro del período", () => {
    expect(countOverlapNights("2026-07-10", "2026-07-13", "2026-07-01", "2026-07-31")).toBe(3);
  });

  it("recorta al borde del período", () => {
    expect(countOverlapNights("2026-06-28", "2026-07-03", "2026-07-01", "2026-07-31")).toBe(2);
  });
});

describe("buildAdminReports", () => {
  it("calcula resumen, ocupación, ranking y saldos", () => {
    const report = buildAdminReports({
      from: "2026-07-01",
      to: "2026-07-03",
      roomCount: 2,
      rooms: [
        { id: "r1", code: "101", name: "Coihue" },
        { id: "r2", code: "102", name: "Arrayán" },
      ],
      reservations: [
        {
          id: "a",
          confirmationCode: "BH-1",
          roomId: "r1",
          roomCode: "101",
          roomName: "Coihue",
          guestFullName: "Ana",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          nights: 2,
          totalAmount: 200000,
          amountPaid: 200000,
          paymentStatus: PaymentStatus.PAID,
          paymentProvider: "mercadopago",
          status: ReservationStatus.CONFIRMED,
          createdAt: "2026-06-20",
        },
        {
          id: "b",
          confirmationCode: "BH-2",
          roomId: "r2",
          roomCode: "102",
          roomName: "Arrayán",
          guestFullName: "Luis",
          checkIn: "2026-07-02",
          checkOut: "2026-07-04",
          nights: 2,
          totalAmount: 100000,
          amountPaid: 50000,
          paymentStatus: PaymentStatus.PARTIAL,
          paymentProvider: "bank_transfer",
          status: ReservationStatus.CONFIRMED,
          createdAt: "2026-07-01",
        },
      ],
    });

    expect(report.daysInPeriod).toBe(3);
    expect(report.summary.arrivalsCount).toBe(2);
    expect(report.summary.createdCount).toBe(1);
    expect(report.summary.nightsSold).toBe(4); // 2 + 2 (jul 2-3 for second)
    // Wait: first: jul1, jul2 = 2 nights. Second: jul2, jul3 = 2 nights. Total 4.
    // capacity = 2 rooms * 3 days = 6. occupancy = 4/6 = 67%
    expect(report.summary.occupancyPercent).toBe(67);
    expect(report.summary.collected).toBe(250000);
    expect(report.summary.committed).toBe(300000);
    expect(report.summary.partialCount).toBe(1);
    expect(report.balances).toHaveLength(1);
    expect(report.balances[0].balanceDue).toBe(50000);
    expect(report.roomRanking[0].roomCode).toBe("101");
    expect(report.byProvider.some((p) => p.provider === "Mercado Pago")).toBe(true);
  });
});

describe("toCsv", () => {
  it("genera CSV con separador ;", () => {
    const csv = toCsv(
      [{ code: "101", nights: 2 }],
      [
        { key: "code", label: "Habitación" },
        { key: "nights", label: "Noches" },
      ]
    );
    expect(csv).toBe("Habitación;Noches\n101;2");
  });
});
