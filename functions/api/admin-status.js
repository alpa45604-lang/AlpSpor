import { requireAdmin } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const isAdmin = await requireAdmin(request, env);
  return new Response(JSON.stringify({ is_admin: isAdmin }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
