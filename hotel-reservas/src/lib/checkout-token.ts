import { SignJWT, jwtVerify } from "jose";
import type { GuestDocumentType } from "./guest-identity";
import { getReservationHoldMinutes } from "./reservation-holds";

export type CheckoutGuestPayload = {
  fullName: string;
  email: string;
  phone: string;
  documentType: GuestDocumentType;
  rut?: string;
  passport?: string;
  birthDate: string;
};

export type CheckoutPayload = {
  typ: "checkout";
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  guest: CheckoutGuestPayload;
  specialRequests?: string;
};

function getCheckoutSecret(): Uint8Array {
  const secret =
    process.env.CHECKOUT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "dev-checkout-secret-min-32-chars!!");

  if (!secret || secret.length < 32) {
    throw new Error("CHECKOUT_SECRET o AUTH_SECRET debe tener al menos 32 caracteres.");
  }

  return new TextEncoder().encode(secret);
}

export async function createCheckoutToken(payload: Omit<CheckoutPayload, "typ">): Promise<string> {
  const holdMinutes = getReservationHoldMinutes();

  return new SignJWT({ ...payload, typ: "checkout" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${holdMinutes * 60}s`)
    .sign(getCheckoutSecret());
}

function parseGuestPayload(guest: unknown): CheckoutGuestPayload {
  if (!guest || typeof guest !== "object") {
    throw new Error("Token de checkout inválido.");
  }

  const g = guest as Record<string, unknown>;
  const fullName = g.fullName;
  const email = g.email;
  const phone = g.phone;
  const birthDate = g.birthDate;
  const documentType = g.documentType;

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    typeof birthDate !== "string"
  ) {
    throw new Error("Token de checkout inválido.");
  }

  const type: GuestDocumentType =
    documentType === "PASSPORT" || documentType === "RUT" ? documentType : "RUT";

  return {
    fullName,
    email,
    phone,
    birthDate,
    documentType: type,
    rut: typeof g.rut === "string" ? g.rut : undefined,
    passport: typeof g.passport === "string" ? g.passport : undefined,
  };
}

export async function verifyCheckoutToken(token: string): Promise<CheckoutPayload> {
  const { payload } = await jwtVerify(token, getCheckoutSecret());

  if (payload.typ !== "checkout") {
    throw new Error("Token de checkout inválido.");
  }

  const roomId = payload.roomId;
  const checkIn = payload.checkIn;
  const checkOut = payload.checkOut;
  const guestsCount = payload.guestsCount;

  if (
    typeof roomId !== "string" ||
    typeof checkIn !== "string" ||
    typeof checkOut !== "string" ||
    typeof guestsCount !== "number"
  ) {
    throw new Error("Token de checkout inválido.");
  }

  return {
    typ: "checkout",
    roomId,
    checkIn,
    checkOut,
    guestsCount,
    guest: parseGuestPayload(payload.guest),
    specialRequests:
      typeof payload.specialRequests === "string" ? payload.specialRequests : undefined,
  };
}
