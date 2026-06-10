import { NextRequest } from "next/server";
import { getCalendarData } from "@/lib/availability";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { calendarQuerySchema } from "@/lib/validations";

/**
 * GET /api/calendar?year=2026&month=6
 * Datos para el dashboard admin (vista Gantt mensual).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = calendarQuerySchema.safeParse({
      year: searchParams.get("year") ?? new Date().getFullYear(),
      month: searchParams.get("month") ?? new Date().getMonth() + 1,
    });

    if (!parsed.success) {
      return jsonError("Parámetros de calendario inválidos.", 400, parsed.error.flatten());
    }

    const data = await getCalendarData(parsed.data.year, parsed.data.month);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
