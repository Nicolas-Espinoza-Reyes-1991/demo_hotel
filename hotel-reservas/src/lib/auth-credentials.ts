import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (username !== expectedUser) return false;

  if (expectedHash) {
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
