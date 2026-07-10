import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  assertPasswordPair,
  assertUsername,
  hashPassword,
  parseStaffRole,
  toPublicStaffUser,
} from "@/lib/staff-users";

export const runtime = "nodejs";

const createUserSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().trim().max(80).optional().nullable(),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    await requireAdminSession();
    const users = await prisma.staffUser.findMany({
      orderBy: [{ role: "asc" }, { username: "asc" }],
    });
    return jsonOk({ users: users.map(toPublicStaffUser) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const username = assertUsername(parsed.data.username);
    assertPasswordPair(parsed.data.password, parsed.data.confirmPassword);
    const role = parseStaffRole(parsed.data.role);

    const existing = await prisma.staffUser.findUnique({ where: { username } });
    if (existing) {
      return jsonError("Ya existe un usuario con ese nombre.", 409, undefined, "DUPLICATE");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.staffUser.create({
      data: {
        username,
        fullName: parsed.data.fullName?.trim() || null,
        role,
        passwordHash,
        active: parsed.data.active ?? true,
      },
    });

    return jsonOk({ user: toPublicStaffUser(user), message: "Usuario creado." }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
