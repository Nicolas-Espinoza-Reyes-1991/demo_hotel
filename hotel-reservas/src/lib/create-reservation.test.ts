import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";

const mockTx = {
  room: { findUnique: vi.fn() },
  guest: { upsert: vi.fn() },
  reservation: { create: vi.fn(), findUnique: vi.fn() },
};

vi.mock("./availability", () => ({
  checkRoomAvailability: vi.fn().mockResolvedValue({
    available: true,
    conflicts: [],
    nights: 1,
    totalAmount: 89,
  }),
}));

import { createReservationFromCheckout } from "./create-reservation";

describe("createReservationFromCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.room.findUnique.mockResolvedValue({
      id: "room-1",
      maxGuests: 4,
      pricePerNight: 89,
    });
    mockTx.guest.upsert.mockResolvedValue({ id: "guest-1", email: "test@example.com" });
    mockTx.reservation.findUnique.mockResolvedValue(null);
    mockTx.reservation.create.mockResolvedValue({ id: "res-1" });
  });

  it("guarda documento, teléfono y fecha de nacimiento", async () => {
    await createReservationFromCheckout(mockTx as never, {
      typ: "checkout",
      roomId: "room-1",
      checkIn: "2026-06-15",
      checkOut: "2026-06-16",
      guestsCount: 2,
      guest: {
        fullName: "Nicolas Espinoza",
        email: "nicolas@example.com",
        phone: "+56943525067",
        documentType: "RUT",
        rut: "18.026.553-8",
        birthDate: "1991-01-15",
      },
    });

    expect(mockTx.guest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          rut: "18.026.553-8",
          documentType: "RUT",
          phone: "+56943525067",
        }),
      })
    );

    expect(mockTx.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          confirmationCode: expect.stringMatching(/^BH-/),
          guestRut: "18.026.553-8",
          guestDocumentType: "RUT",
          guestBirthDate: expect.any(Date),
          paymentStatus: PaymentStatus.PENDING,
          status: ReservationStatus.CONFIRMED,
        }),
      })
    );
  });
});
