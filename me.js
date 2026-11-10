
import { requireAdmin } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const authenticated = await requireAdmin(request, env);

  return new Response(JSON.stringify({
    authenticated,
    admin: authenticated
  }), {
    status: authenticated ? 200 : 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
