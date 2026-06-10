import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { verifyAdminCredentials } from "@/lib/auth-credentials";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido."),
  password: z.string().min(1, "Contraseña requerida."),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`login:${ip}`, 5, 15 * 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const { username, password } = parsed.data;
    const valid = await verifyAdminCredentials(username, password);

    if (!valid) {
      return jsonError("Usuario o contraseña incorrectos.", 401, undefined, "INVALID_CREDENTIALS");
    }

    const token = await createSessionToken(username);
    const response = jsonOk({ message: "Sesión iniciada.", username });

    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
