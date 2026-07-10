import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
  code?: string;
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  message: string,
  status = 400,
  details?: unknown,
  code?: string
) {
  const body: ApiErrorBody = { error: message, details, code };
  return NextResponse.json(body, { status });
}

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

function toSpanishApiMessage(message: string): string {
  if (/Cannot read properties of undefined/i.test(message) || /is not a function/i.test(message)) {
    return "Error interno del servidor. Reiniciá la aplicación e intentá de nuevo.";
  }
  if (/AUTH_SECRET/i.test(message)) {
    return "Configuración de autenticación incompleta en el servidor.";
  }
  return message;
}

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);

  if (error instanceof AppError) {
    return jsonError(error.message, error.status, undefined, error.code);
  }

  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return jsonError("Conflicto de datos duplicados.", 409, error.message, "DUPLICATE");
    }
    const status = (error as Error & { status?: number }).status;
    const message = toSpanishApiMessage(error.message);
    if (status === 401) return jsonError(message, 401, undefined, "UNAUTHORIZED");
    if (status === 403) return jsonError(message, 403, undefined, "FORBIDDEN");
    if (status === 400) return jsonError(message, 400, undefined, "BAD_REQUEST");
    if (status === 404) return jsonError(message, 404, undefined, "NOT_FOUND");
    if (status === 409) return jsonError(message, 409, undefined, "CONFLICT");
    if (status === 503) return jsonError(message, 503, undefined, "UNAVAILABLE");
    return jsonError(message, 500, undefined, "INTERNAL");
  }

  return jsonError("Error interno del servidor.", 500, undefined, "INTERNAL");
}
