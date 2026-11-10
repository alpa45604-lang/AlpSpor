
import { requireAdmin } from "../_lib/auth.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function validUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function clean(value, max = 250) {
  return String(value ?? "").trim().slice(0, max);
}

function validateMatch(body) {
  const title = clean(body.title, 150);
  const home = clean(body.home_team, 100);
  const away = clean(body.away_team, 100);
  const homeLogo = clean(body.home_logo, 1000);
  const awayLogo = clean(body.away_logo, 1000);
  const streamUrl = clean(body.stream_url, 3000);
  const matchTime = clean(body.match_time, 50);
  const status = clean(body.status, 20);

  if (!title || !home || !away || !matchTime) {
    throw new Error("Maç başlığı, takımlar ve tarih zorunludur.");
  }

  if (!["live", "upcoming", "finished"].includes(status)) {
    throw new Error("Geçersiz maç durumu.");
  }

  if (!validUrl(homeLogo) || !validUrl(awayLogo)) {
    throw new Error("Takım logoları HTTPS adresi olmalıdır.");
  }

  if (!validUrl(streamUrl)) {
    throw new Error("Yayın adresi HTTPS adresi olmalıdır.");
  }

  if (status === "live" && !streamUrl) {
    throw new Error("Canlı maç için yayın adresi gereklidir.");
  }

  if (Number.isNaN(Date.parse(matchTime))) {
    throw new Error("Geçersiz maç tarihi.");
  }

  return {
    title,
    home_team: home,
    away_team: away,
    home_logo: homeLogo,
    away_logo: awayLogo,
    stream_url: streamUrl,
    match_time: new Date(matchTime).toISOString(),
    status
  };
}

async function isAdmin(request, env) {
  return await requireAdmin(request, env);
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) {
      return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
    }

    const admin = await isAdmin(request, env);

    let result;

    if (admin) {
      result = await env.DB.prepare(
        `SELECT id, title, home_team, away_team,
                home_logo, away_logo, stream_url,
                match_time, status, created_at
         FROM matches
         ORDER BY match_time ASC`
      ).all();
    } else {
      result = await env.DB.prepare(
        `SELECT id, title, home_team, away_team,
                home_logo, away_logo, stream_url,
                match_time, status, created_at
         FROM matches
         WHERE status = 'live'
         ORDER BY match_time ASC`
      ).all();
    }

    return json({ matches: result.results || [] });

  } catch (error) {
    return json({ error: "Maçlar yüklenemedi." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Yönetici girişi gerekli." }, 401);
    }

    if (!env.DB) {
      return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
    }

    const body = await request.json();
    const match = validateMatch(body);
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO matches
       (id, title, home_team, away_team, home_logo,
        away_logo, stream_url, match_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      match.title,
      match.home_team,
      match.away_team,
      match.home_logo,
      match.away_logo,
      match.stream_url,
      match.match_time,
      match.status
    ).run();

    return json({
      success: true,
      message: "Maç eklendi.",
      id
    }, 201);

  } catch (error) {
    return json({ error: error.message || "Maç eklenemedi." }, 400);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Yönetici girişi gerekli." }, 401);
    }

    if (!env.DB) {
      return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
    }

    const body = await request.json();
    const id = clean(body.id, 100);

    if (!id) {
      return json({ error: "Maç kimliği eksik." }, 400);
    }

    const match = validateMatch(body);

    const result = await env.DB.prepare(
      `UPDATE matches
       SET title = ?, home_team = ?, away_team = ?,
           home_logo = ?, away_logo = ?, stream_url = ?,
           match_time = ?, status = ?
       WHERE id = ?`
    ).bind(
      match.title,
      match.home_team,
      match.away_team,
      match.home_logo,
      match.away_logo,
      match.stream_url,
      match.match_time,
      match.status,
      id
    ).run();

    if (!result.meta.changes) {
      return json({ error: "Maç bulunamadı." }, 404);
    }

    return json({
      success: true,
      message: "Maç güncellendi."
    });

  } catch (error) {
    return json({ error: error.message || "Maç güncellenemedi." }, 400);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Yönetici girişi gerekli." }, 401);
    }

    if (!env.DB) {
      return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
    }

    const body = await request.json();
    const id = clean(body.id, 100);

    if (!id) {
      return json({ error: "Maç kimliği eksik." }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM matches WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({ error: "Maç bulunamadı." }, 404);
    }

    return json({
      success: true,
      message: "Maç silindi."
    });

  } catch (error) {
    return json({ error: error.message || "Maç silinemedi." }, 400);
  }
}
