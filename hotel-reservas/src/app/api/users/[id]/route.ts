import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
  requireAdminSession,
} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  assertPasswordPair,
  assertUsername,
  countActiveAdmins,
  hashPassword,
  parseStaffRole,
  toPublicStaffUser,
} from "@/lib/staff-users";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  fullName: z.string().trim().max(80).nullable().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  active: z.boolean().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.staffUser.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Usuario no encontrado.", 404, undefined, "NOT_FOUND");
    }

    // Cambio de contraseña (acción dedicada)
    if ("password" in body || "confirmPassword" in body) {
      const parsed = passwordSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError("Datos inválidos.", 400, parsed.error.flatten());
      }
      assertPasswordPair(parsed.data.password, parsed.data.confirmPassword);
      const passwordHash = await hashPassword(parsed.data.password);
      const user = await prisma.staffUser.update({
        where: { id },
        data: { passwordHash },
      });
      return jsonOk({ user: toPublicStaffUser(user), message: "Contraseña actualizada." });
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const data: {
      username?: string;
      fullName?: string | null;
      role?: "ADMIN" | "STAFF";
      active?: boolean;
    } = {};

    if (parsed.data.username !== undefined) {
      data.username = assertUsername(parsed.data.username);
      if (data.username !== existing.username) {
        const clash = await prisma.staffUser.findUnique({ where: { username: data.username } });
        if (clash) {
          return jsonError("Ya existe un usuario con ese nombre.", 409, undefined, "DUPLICATE");
        }
      }
    }

    if (parsed.data.fullName !== undefined) {
      data.fullName = parsed.data.fullName?.trim() || null;
    }

    if (parsed.data.role !== undefined) {
      data.role = parseStaffRole(parsed.data.role);
    }

    if (parsed.data.active !== undefined) {
      data.active = parsed.data.active;
    }

    const nextRole = data.role ?? existing.role;
    const nextActive = data.active ?? existing.active;
    const wasActiveAdmin = existing.role === "ADMIN" && existing.active;
    const willBeActiveAdmin = nextRole === "ADMIN" && nextActive;

    if (wasActiveAdmin && !willBeActiveAdmin) {
      const others = await countActiveAdmins(existing.id);
      if (others === 0) {
        return jsonError(
          "No podés desactivar ni quitar el rol al último administrador activo.",
          400,
          undefined,
          "LAST_ADMIN"
        );
      }
    }

    const user = await prisma.staffUser.update({
      where: { id },
      data,
    });

    const response = jsonOk({ user: toPublicStaffUser(user), message: "Usuario actualizado." });

    // Si editás tu propio usuario, renovar la cookie de sesión con el nombre/rol nuevos
    const isSelf =
      (session.userId && session.userId === user.id) ||
      (!session.userId && session.username === existing.username);
    if (isSelf && user.active) {
      const token = await createSessionToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAdminSession();
    const { id } = await context.params;

    const existing = await prisma.staffUser.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Usuario no encontrado.", 404, undefined, "NOT_FOUND");
    }

    if (existing.id === session.userId) {
      return jsonError("No podés eliminar tu propio usuario.", 400, undefined, "SELF_DELETE");
    }

    if (existing.role === "ADMIN" && existing.active) {
      const others = await countActiveAdmins(existing.id);
      if (others === 0) {
        return jsonError(
          "No podés eliminar al último administrador activo.",
          400,
          undefined,
          "LAST_ADMIN"
        );
      }
    }

    await prisma.staffUser.delete({ where: { id } });
    return jsonOk({ message: "Usuario eliminado." });
  } catch (error) {
    return handleApiError(error);
  }
}
