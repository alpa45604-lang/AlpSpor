import { requireAdmin } from "../_lib/auth.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

// İstatistikleri yalnızca giriş yapmış yönetici görebilir.
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) {
    return json({ error: "Yönetici girişi gerekli." }, 401);
  }

  if (!env.DB) {
    return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
  }

  const url = new URL(request.url);
  const matchId = clean(url.searchParams.get("match_id"));

  if (!matchId) {
    return json({ error: "Maç kimliği gerekli." }, 400);
  }

  try {
    const activeSince = Math.floor(Date.now() / 1000) - 75;
    const [total, active] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS total FROM stream_view_sessions WHERE match_id = ?"
      ).bind(matchId).first(),
      env.DB.prepare(
        "SELECT COUNT(*) AS active FROM stream_view_sessions WHERE match_id = ? AND last_seen >= ?"
      ).bind(matchId, activeSince).first()
    ]);

    return json({
      match_id: matchId,
      total_views: Number(total?.total || 0),
      active_viewers: Number(active?.active || 0)
    });
  } catch (error) {
    return json({ error: "İzlenme bilgileri alınamadı." }, 500);
  }
}

// İzleyici oturumunu kaydetme herkese açık kalır; sayılar dışarıya verilmez.
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
  }

  try {
    const body = await request.json();
    const matchId = clean(body.match_id);
    const viewerId = clean(body.viewer_id, 80);

    if (!matchId || !/^[a-zA-Z0-9_-]{12,80}$/.test(viewerId)) {
      return json({ error: "Geçersiz izleyici bilgisi." }, 400);
    }

    const match = await env.DB.prepare(
      "SELECT id FROM matches WHERE id = ? AND status = 'live'"
    ).bind(matchId).first();

    if (!match) {
      return json({ error: "Bu yayın şu anda canlı değil." }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO stream_view_sessions
       (match_id, viewer_id, first_seen, last_seen)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(match_id, viewer_id)
       DO UPDATE SET last_seen = excluded.last_seen`
    ).bind(matchId, viewerId, now, now).run();

    return json({ success: true });
  } catch (error) {
    return json({ error: "İzleyici kaydı yapılamadı." }, 500);
  }
}
