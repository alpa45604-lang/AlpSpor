
import { clearSessionCookie } from "../_lib/auth.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({
    success: true,
    message: "Oturum kapatıldı."
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": clearSessionCookie()
    }
  });
}
