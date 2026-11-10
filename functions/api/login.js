
import {
  createSession,
  sessionCookie
} from "../_lib/auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_USERNAME ||
        !env.ADMIN_PASSWORD ||
        !env.SESSION_SECRET) {
      return json({
        error: "Yönetici ayarları henüz tamamlanmadı."
      }, 503);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Geçersiz istek." }, 415);
    }

    const body = await request.json();

    const username = String(body.username || "");
    const password = String(body.password || "");

    if (username.length > 100 || password.length > 200) {
      return json({ error: "Geçersiz giriş bilgileri." }, 400);
    }

    if (
      username !== env.ADMIN_USERNAME ||
      password !== env.ADMIN_PASSWORD
    ) {
      return json({
        error: "Kullanıcı adı veya şifre hatalı."
      }, 401);
    }

    const token = await createSession(env.SESSION_SECRET);

    return new Response(JSON.stringify({
      success: true,
      message: "Yönetici girişi başarılı."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": sessionCookie(token)
      }
    });

  } catch (error) {
    return json({
      error: "Giriş işlemi sırasında bir hata oluştu."
    }, 500);
  }
}
