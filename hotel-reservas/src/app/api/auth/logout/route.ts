import { jsonOk } from "@/lib/api-response";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = jsonOk({ message: "Sesión cerrada." });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
