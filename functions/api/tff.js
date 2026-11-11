
export async function onRequest(context) {
  const key = context.env.TFF_API_KEY;

  if (!key) {
    return Response.json(
      { durum: "hata", hata: "TFF_API_KEY bulunamadı." },
      { status: 500 }
    );
  }

  const incoming = new URL(context.request.url);
  const tip = incoming.searchParams.get("tip") || "fiktur";

  if (tip !== "fiktur" && tip !== "puan") {
    return Response.json(
      { durum: "hata", hata: "Geçersiz sorgu türü." },
      { status: 400 }
    );
  }

  const url = new URL("https://tff.kkerem.com/");
  url.searchParams.set("apikey", key);
  url.searchParams.set("tip", tip);

  if (tip === "fiktur") {
    const hafta = incoming.searchParams.get("hafta");

    if (hafta) {
      const n = Number(hafta);

      if (!Number.isInteger(n) || n < 1 || n > 34) {
        return Response.json(
          { durum: "hata", hata: "Hafta 1-34 arasında olmalıdır." },
          { status: 400 }
        );
      }

      url.searchParams.set("hafta", String(n));
    }
  }

  try {
    const response = await fetch(url.toString());
    const body = await response.text();

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return Response.json(
        { durum: "hata", hata: "TFF geçerli veri döndürmedi." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return Response.json(
        { durum: "hata", hata: "TFF servisine ulaşılamadı." },
        { status: 502 }
      );
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, max-age=300"
      }
    });
  } catch {
    return Response.json(
      { durum: "hata", hata: "Bağlantı kurulamadı." },
      { status: 502 }
    );
  }
}
