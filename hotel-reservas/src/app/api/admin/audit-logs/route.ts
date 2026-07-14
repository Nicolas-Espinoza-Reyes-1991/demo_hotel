import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/auth";
import { listAdminAuditLogs } from "@/lib/admin-audit";

export const runtime = "nodejs";

const querySchema = z.object({
  action: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = querySchema.safeParse({
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return jsonError("Parámetros inválidos.", 400, parsed.error.flatten());
    }

    const logs = await listAdminAuditLogs({
      action: parsed.data.action,
      limit: parsed.data.limit,
    });
    return jsonOk({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}
