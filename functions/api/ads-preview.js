
import { requireAdmin } from "../_lib/auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safePublicUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;

    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;

    return u;
  } catch {
    return null;
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getMeta(html, wanted) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = {};
    const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match;

    while ((match = regex.exec(tag))) {
      attrs[match[1].toLowerCase()] =
        match[2] ?? match[3] ?? match[4] ?? "";
    }

    const key = (attrs.property || attrs.name || "").toLowerCase();

    if (key === wanted && attrs.content) {
      return decodeHtml(attrs.content);
    }
  }

  return "";
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await requireAdmin(request, env))) {
      return json({ error: "Önce yönetici girişi yapmalısın." }, 401);
    }

    const body = await request.json();
    const url = safePublicUrl(body.url);

    if (!url) {
      return json({
        error: "Geçerli ve HTTPS ile başlayan bir internet sitesi adresi gir."
      }, 400);
    }

    const response = await fetch(url.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 AlpSportAdPreview/1.0",
        "Accept": "text/html"
      },
      redirect: "follow"
    });

    const finalUrl = safePublicUrl(response.url || url.href);

    if (!finalUrl || !response.ok) {
      return json({ error: "İnternet sitesi açılamadı." }, 400);
    }

    const html = (await response.text()).slice(0, 1500000);

    let title = getMeta(html, "og:title") ||
      getMeta(html, "twitter:title");

    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch ? decodeHtml(titleMatch[1].trim()) : "";
    }

    let image = getMeta(html, "og:image") ||
      getMeta(html, "twitter:image");

    if (image) {
      try {
        image = new URL(image, finalUrl.href).href;
        if (!image.startsWith("https://")) image = "";
      } catch {
        image = "";
      }
    }

    return json({
      success: true,
      title: title.slice(0, 180),
      image_url: image,
      target_url: url.href,
      message: image
        ? "Reklam görseli bulundu."
        : "Bu sitede otomatik reklam görseli bulunamadı. Görsel adresini elle girebilirsin."
    });

  } catch (error) {
    return json({
      error: "Reklam önizlemesi alınamadı. Site erişimini kontrol et."
    }, 500);
  }
}
