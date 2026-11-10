export async function onRequest(context) {
  const token = context.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return Response.json(
      { error: "Futbol veri anahtarı bulunamadı." },
      { status: 500 }
    );
  }

  const today = new Date();
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + 7);

  const dateFrom = today.toISOString().slice(0, 10);
  const dateTo = endDate.toISOString().slice(0, 10);

  const competitions = [
    "PL", "ELC", "BL1", "SA", "PD", "FL1",
    "DED", "PPL", "BSA", "CL", "EC", "WC"
  ].join(",");

  const url = new URL(
    "https://api.football-data.org/v4/matches"
  );

  url.searchParams.set("competitions", competitions);
  url.searchParams.set("dateFrom", dateFrom);
  url.searchParams.set("dateTo", dateTo);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "X-Auth-Token": token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "Maç verileri alınamadı." },
        { status: response.status }
      );
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (error) {
    return Response.json(
      { error: "Veri bağlantısı kurulamadı." },
      { status: 502 }
    );
  }
    }
