import { jsonOk } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonOk({
      authenticated: false,
      username: null,
      role: null,
      userId: null,
      fullName: null,
    });
  }

  // Preferir datos frescos de la BD (p. ej. si se renombró el usuario)
  if (session.userId) {
    const user = await prisma.staffUser.findUnique({ where: { id: session.userId } });
    if (user && user.active) {
      return jsonOk({
        authenticated: true,
        username: user.username,
        role: user.role,
        userId: user.id,
        fullName: user.fullName,
      });
    }
  }

  return jsonOk({
    authenticated: true,
    username: session.username,
    role: session.role,
    userId: session.userId || null,
    fullName: null,
  });
}
