import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { sendContactEmail } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { contactFormSchema } from "@/lib/validations";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function withCorsHeaders(response: Response) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

/**
 * POST /api/public/contact
 * Recibe mensajes del formulario de contacto de la landing.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
    if (!limited.ok) {
      return withCorsHeaders(rateLimitResponse(limited.retryAfterSec));
    }

    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return withCorsHeaders(
        jsonError("Datos del formulario inválidos.", 400, parsed.error.flatten())
      );
    }

    if (parsed.data.website?.trim()) {
      return withCorsHeaders(
        jsonOk({
          success: true,
          delivered: true,
          message: "Mensaje enviado correctamente.",
        })
      );
    }

    const delivered = await sendContactEmail({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    return withCorsHeaders(
      jsonOk({
        success: true,
        delivered,
        message: delivered
          ? "Mensaje enviado correctamente. Te responderemos pronto."
          : "Mensaje recibido. Te responderemos pronto.",
      })
    );
  } catch (error) {
    return withCorsHeaders(handleApiError(error));
  }
}
