import bcrypt from "bcryptjs";
import type { StaffRole, StaffUser } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyAdminCredentials } from "@/lib/auth-credentials";
import {
  getPasswordValidationError,
  getUsernameValidationError,
} from "@/lib/password-policy";
import type { PublicStaffUser, StaffRoleCode } from "@/types/staff";
import { AppError } from "@/lib/api-response";

export type { PublicStaffUser, StaffRoleCode };

const BCRYPT_ROUNDS = 12;

function staffUserDelegate() {
  const delegate = (prisma as { staffUser?: typeof prisma.staffUser }).staffUser;
  if (!delegate) {
    throw new AppError(
      "El módulo de usuarios aún no está listo. Reiniciá el servidor tras aplicar las migraciones.",
      503,
      "STAFF_MODEL_MISSING"
    );
  }
  return delegate;
}

export function toPublicStaffUser(user: StaffUser): PublicStaffUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let bootstrapPromise: Promise<void> | null = null;

/** Crea el admin inicial desde env si la tabla está vacía (una sola vez). */
export async function ensureStaffBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const staff = staffUserDelegate();
      const count = await staff.count();
      if (count > 0) return;

      const username = (process.env.ADMIN_USERNAME?.trim() || "admin").toLowerCase();
      const plain = process.env.ADMIN_PASSWORD?.trim();
      const hashEnv = process.env.ADMIN_PASSWORD_HASH?.trim();

      let passwordHash: string | null = null;
      if (hashEnv && /^\$2[aby]\$\d{2}\$/.test(hashEnv)) {
        passwordHash = hashEnv;
      } else if (plain) {
        passwordHash = await hashPassword(plain);
      }

      if (!passwordHash) {
        console.warn(
          "[staff] No hay usuarios y faltan ADMIN_PASSWORD / ADMIN_PASSWORD_HASH. Creá el primer admin manualmente."
        );
        return;
      }

      await staff.create({
        data: {
          username,
          fullName: "Administrador",
          passwordHash,
          role: "ADMIN",
          active: true,
        },
      });
      console.info(`[staff] Admin inicial creado: ${username}`);
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}

export async function authenticateStaff(
  username: string,
  password: string
): Promise<StaffUser | null> {
  await ensureStaffBootstrap();

  const staff = staffUserDelegate();
  const normalized = username.trim().toLowerCase();
  const user = await staff.findUnique({ where: { username: normalized } });

  if (user) {
    if (!user.active) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    return staff.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // Fallback legacy: si aún no hay filas (bootstrap falló) o usuario env-only
  const count = await staff.count();
  if (count === 0) {
    const valid = await verifyAdminCredentials(username, password);
    if (!valid) return null;
    const passwordHash = await hashPassword(password);
    return staff.create({
      data: {
        username: normalized || (process.env.ADMIN_USERNAME?.trim() || "admin").toLowerCase(),
        fullName: "Administrador",
        passwordHash,
        role: "ADMIN",
        active: true,
        lastLoginAt: new Date(),
      },
    });
  }

  return null;
}

export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  return staffUserDelegate().count({
    where: {
      role: "ADMIN",
      active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export function assertPasswordPair(password: string, confirmPassword: string): void {
  const error = getPasswordValidationError(password, confirmPassword);
  if (error) throw new AppError(error, 400, "PASSWORD_POLICY");
}

export function assertUsername(username: string): string {
  const error = getUsernameValidationError(username);
  if (error) throw new AppError(error, 400, "USERNAME_INVALID");
  return username.trim().toLowerCase();
}

export function parseStaffRole(value: unknown): StaffRole {
  if (value === "ADMIN" || value === "STAFF") return value;
  throw new AppError("Rol inválido. Usá ADMIN o STAFF.", 400, "ROLE_INVALID");
}
