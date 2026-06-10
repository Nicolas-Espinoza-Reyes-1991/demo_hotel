import { jsonOk } from "@/lib/api-response";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  return jsonOk({
    authenticated: !!session,
    username: session?.username ?? null,
  });
}
