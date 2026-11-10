
import { requireAdmin } from "../_lib/auth.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

const slots = ["live1", "live2", "live3", "live4", "live5"];

function validHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Canlı yayın reklamlarını ziyaretçilere gönder
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);

  try {
    const result = await env.DB.prepare(
      "SELECT slot, image_url, target_url, active FROM ad_slots WHERE slot IN ('live1','live2','live3','live4','live5')"
    ).all();

    return json({ ads: result.results || [] });
  } catch (error) {
    return json({ error: "Canlı yayın reklamları yüklenemedi." }, 500);
  }
}

// Yönetici canlı yayın reklamlarını kaydeder
export async function onRequestPut({ request, env }) {
  if (!(await requireAdmin(request, env))) {
    return json({ error: "Yönetici girişi gerekli." }, 401);
  }

  if (!env.DB) return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);

  try {
    const body = await request.json();

    if (!Array.isArray(body.ads) || body.ads.length !== 5) {
      return json({ error: "Beş reklamın tamamı gönderilmelidir." }, 400);
    }

    const seen = new Set();

    const statements = body.ads.map(ad => {
      const slot = String(ad.slot || "").trim();
      const image = String(ad.image_url || "").trim();
      const target = String(ad.target_url || "").trim();

      if (!slots.includes(slot) || seen.has(slot)) {
        throw new Error("Reklam alanı hatalı veya tekrarlanmış.");
      }

      seen.add(slot);

      if (!validHttps(image) || !validHttps(target)) {
        throw new Error("Reklam görseli ve bağlantısı HTTPS olmalıdır.");
      }

      return env.DB.prepare(
        `INSERT INTO ad_slots
         (slot, image_url, target_url, active, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(slot) DO UPDATE SET
           image_url = excluded.image_url,
           target_url = excluded.target_url,
           active = excluded.active,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(slot, image, target, ad.active ? 1 : 0);
    });

    if (seen.size !== 5) {
      return json({ error: "Beş ayrı reklam alanı gerekli." }, 400);
    }

    await env.DB.batch(statements);

    return json({
      success: true,
      message: "Beş canlı yayın reklamı kaydedildi."
    });
  } catch (error) {
    return json({ error: error.message || "Reklamlar kaydedilemedi." }, 400);
  }
}
