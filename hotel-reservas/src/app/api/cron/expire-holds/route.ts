import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { expireStaleHoldReservations } from "@/lib/reservation-holds";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** GET/POST /api/cron/expire-holds — libera inventario de reservas impagadas expiradas. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("No autorizado.", 401);
  }

  const expired = await expireStaleHoldReservations();
  return jsonOk({ expired, message: `${expired} reserva(s) expirada(s).` });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
