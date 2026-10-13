import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Meteo in base alla posizione attuale del browser (richiesta esplicita di
// Filippo: non una città fissa) — il permesso di geolocalizzazione lo chiede
// il componente lato client, qui si riceve solo lat/lon e si fa da proxy
// verso Open-Meteo: gratuito, nessuna chiave API richiesta, nessun account.
const URL_BASE = "https://api.open-meteo.com/v1/forecast";

// Tabella codici meteo WMO usata da Open-Meteo — è uno standard stabile,
// non cambia da un giorno all'altro.
const DESCRIZIONI = {
  0: ["Sereno", "☀️"],
  1: ["Prevalentemente sereno", "🌤️"],
  2: ["Parzialmente nuvoloso", "⛅"],
  3: ["Nuvoloso", "☁️"],
  45: ["Nebbia", "🌫️"],
  48: ["Nebbia con brina", "🌫️"],
  51: ["Pioviggine leggera", "🌦️"],
  53: ["Pioviggine", "🌦️"],
  55: ["Pioviggine intensa", "🌦️"],
  56: ["Pioviggine gelata", "🌦️"],
  57: ["Pioviggine gelata intensa", "🌦️"],
  61: ["Pioggia leggera", "🌧️"],
  63: ["Pioggia", "🌧️"],
  65: ["Pioggia intensa", "🌧️"],
  66: ["Pioggia gelata", "🌧️"],
  67: ["Pioggia gelata intensa", "🌧️"],
  71: ["Neve leggera", "🌨️"],
  73: ["Neve", "🌨️"],
  75: ["Neve intensa", "🌨️"],
  77: ["Granelli di neve", "🌨️"],
  80: ["Rovesci leggeri", "🌦️"],
  81: ["Rovesci", "🌦️"],
  82: ["Rovesci intensi", "⛈️"],
  85: ["Rovesci di neve leggeri", "🌨️"],
  86: ["Rovesci di neve intensi", "🌨️"],
  95: ["Temporale", "⛈️"],
  96: ["Temporale con grandine", "⛈️"],
  99: ["Temporale con grandine intensa", "⛈️"],
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ disponibile: false, errore: "Coordinate non valide" }, { status: 400 });
  }

  const url = `${URL_BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`risposta ${res.status}`);
    const dati = await res.json();
    const corrente = dati.current;
    if (!corrente) throw new Error("dati mancanti");

    const [descrizione, emoji] = DESCRIZIONI[corrente.weather_code] || ["—", "🌡️"];
    return NextResponse.json({
      disponibile: true,
      temperatura: Math.round(corrente.temperature_2m),
      descrizione,
      emoji,
    });
  } catch (err) {
    return NextResponse.json({ disponibile: false, errore: `Meteo non disponibile: ${err.message}` }, { status: 200 });
  }
}
