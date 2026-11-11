import { requireAdmin } from "../_lib/auth.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function validHttps(value) {
  if (!value) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const slots = [
  "top1", "top2", "top3",
  "bottom1", "bottom2", "bottom3"
];

// Reklamları ziyaretçilere göster
export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
  }

  try {
    const result = await env.DB.prepare(
      "SELECT slot, image_url, target_url, active FROM ad_slots WHERE slot IN ('top1','top2','top3','bottom1','bottom2','bottom3')"
    ).all();

    return json({ ads: result.results || [] });
  } catch (error) {
    return json({
      error: "Reklamlar yüklenemedi. Veritabanı tablosunu kontrol edin."
    }, 500);
  }
}

// Yalnızca yönetici reklamları kaydedebilir
export async function onRequestPut({ request, env }) {
  if (!(await requireAdmin(request, env))) {
    return json({ error: "Yönetici girişi gerekli." }, 401);
  }

  if (!env.DB) {
    return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body.ads) || body.ads.length !== 6) {
      return json({
        error: "Altı reklam alanının tamamı gönderilmelidir."
      }, 400);
    }

    const normalized = body.ads.map(ad => {
      const slot = clean(ad.slot, 20);
      const imageUrl = clean(ad.image_url, 2000);
      const targetUrl = clean(ad.target_url, 2000);

      if (!slots.includes(slot)) {
        throw new Error("Geçersiz reklam alanı.");
      }

      if (!validHttps(imageUrl) || !validHttps(targetUrl)) {
        throw new Error("Reklam görseli ve bağlantısı HTTPS olmalıdır.");
      }

      return {
        slot,
        image_url: imageUrl,
        target_url: targetUrl,
        active: ad.active ? 1 : 0
      };
    });

    if (
      new Set(normalized.map(item => item.slot)).size !== 6 ||
      !slots.every(slot => normalized.some(item => item.slot === slot))
    ) {
      return json({
        error: "Her reklam alanı yalnızca bir kez gönderilmelidir."
      }, 400);
    }

    const statements = normalized.map(ad =>
      env.DB.prepare(
        `INSERT INTO ad_slots
         (slot, image_url, target_url, active, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(slot) DO UPDATE SET
           image_url = excluded.image_url,
           target_url = excluded.target_url,
           active = excluded.active,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(
        ad.slot,
        ad.image_url,
        ad.target_url,
        ad.active
      )
    );

    await env.DB.batch(statements);

    return json({
      success: true,
      message: "Altı reklam alanı kaydedildi."
    });
  } catch (error) {
    return json({
      error: error.message || "Reklamlar kaydedilemedi."
    }, 400);
  }
}


export async function onRequestDelete({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: "Yönetici girişi gerekli." }, 401);
  if (!env.DB) return json({ error: "Veritabanı bağlantısı bulunamadı." }, 503);
  const slot = new URL(request.url).searchParams.get("slot");
  if (!slots.includes(slot)) return json({ error: "Geçersiz reklam alanı." }, 400);
  try {
    await env.DB.prepare("UPDATE ad_slots SET image_url = '', target_url = '', active = 0, updated_at = CURRENT_TIMESTAMP WHERE slot = ?").bind(slot).run();
    return json({ success: true, message: "Reklam silindi." });
  } catch (error) {
    return json({ error: "Reklam silinemedi." }, 500);
  }
}
