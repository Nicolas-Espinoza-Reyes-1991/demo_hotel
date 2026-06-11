import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

function envTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export function isAdminAuthConfigured(): boolean {
  const hash = envTrim(process.env.ADMIN_PASSWORD_HASH);
  if (hash && isBcryptHash(hash)) return true;
  return Boolean(envTrim(process.env.ADMIN_PASSWORD));
}

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUser = envTrim(process.env.ADMIN_USERNAME) ?? "admin";
  const expectedPassword = envTrim(process.env.ADMIN_PASSWORD);
  const expectedHash = envTrim(process.env.ADMIN_PASSWORD_HASH);

  if (username.trim() !== expectedUser) return false;

  if (expectedHash && isBcryptHash(expectedHash)) {
    return bcrypt.compare(password, expectedHash);
  }

  if (expectedPassword) {
    const input = Buffer.from(password);
    const expected = Buffer.from(expectedPassword);
    if (input.length !== expected.length) return false;
    return timingSafeEqual(input, expected);
  }

  return false;
}
