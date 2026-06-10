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

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);

  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return jsonError("Conflicto de datos duplicados.", 409, error.message, "DUPLICATE");
    }
    return jsonError(error.message, 500, undefined, "INTERNAL");
  }

  return jsonError("Error interno del servidor.", 500, undefined, "INTERNAL");
}
