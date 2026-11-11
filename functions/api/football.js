// AlpSport API-Football deploy kontrolu: 2026-11-12
export async function onRequest(context) {
  const key = context.env.API_FOOTBALL_KEY;
  if (!key) {
    return Response.json(
      { durum: "hata", hata: "API_FOOTBALL_KEY gizli değişkeni henüz eklenmedi." },
      { status: 503 }
    );
  }

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10);
  const season = now.getUTCFullYear();

  const cache = caches.default;
  const cacheUrl = new URL(context.request.url);
  cacheUrl.search = "?cache=turkey-fixtures-" + season;
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
  apiUrl.searchParams.set("league", "203");
  apiUrl.searchParams.set("season", String(season));
  apiUrl.searchParams.set("from", from);
  apiUrl.searchParams.set("to", to);
  apiUrl.searchParams.set("timezone", "Europe/Istanbul");

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: { "x-apisports-key": key }
    });
    const payload = await response.json();

    if (!response.ok || payload.errors && Object.keys(payload.errors).length) {
      return Response.json(
        { durum: "hata", hata: "Futbol veri servisi yanıt vermedi.", ayrinti: payload.errors || null },
        { status: 502 }
      );
    }

    const durumMap = {
      NS: "oynanacak", TBD: "oynanacak", 1H: "1. yarı", HT: "devre arası",
      2H: "2. yarı", ET: "uzatma", BT: "uzatma arası", P: "penaltılar",
      SUSP: "durduruldu", INT: "durduruldu", FT: "tamamlandı",
      AET: "tamamlandı", PEN: "tamamlandı", PST: "ertelendi",
      CANC: "iptal edildi", ABD: "yarıda kaldı", AWD: "tamamlandı", WO: "tamamlandı"
    };

    const maclar = (Array.isArray(payload.response) ? payload.response : []).map(item => {
      const fixture = item.fixture || {};
      const teams = item.teams || {};
      const goals = item.goals || {};
      const status = fixture.status || {};
      const date = fixture.date ? new Date(fixture.date) : null;
      const hasScore = goals.home !== null && goals.away !== null;
      return {
        id: fixture.id,
        ev_sahibi: teams.home?.name || "Ev sahibi",
        deplasman: teams.away?.name || "Deplasman",
        ev_sahibi_logo: teams.home?.logo || "",
        deplasman_logo: teams.away?.logo || "",
        tarih: date ? date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "",
        saat: date ? date.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }) : "",
        durum: durumMap[status.short] || status.long || "oynanacak",
        skor: hasScore ? String(goals.home) + " - " + String(goals.away) : "VS",
        mac_url: "",
        lig: item.league?.name || "Trendyol Süper Lig",
        dakika: status.elapsed ?? null
      };
    });

    const result = Response.json(
      { durum: "basarili", hafta: null, mac_sayisi: maclar.length, maclar, kaynak: "API-Football" },
      { headers: { "Cache-Control": "public, s-maxage=900, max-age=300, stale-while-revalidate=60" } }
    );
    context.waitUntil(cache.put(cacheKey, result.clone()));
    return result;
  } catch {
    return Response.json(
      { durum: "hata", hata: "Futbol verisi alınırken bağlantı hatası oluştu." },
      { status: 502 }
    );
  }
}
