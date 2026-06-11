import { jsonOk } from "@/lib/api-response";
import { isAdminAuthConfigured } from "@/lib/auth-credentials";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      status: "ok",
      timestamp: new Date().toISOString(),
      adminAuthConfigured: isAdminAuthConfigured(),
    });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
