import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";

// ── Config ──────────────────────────────────────────────────────────────────
// Override via env vars in .env.local:
//   WEATHER_LOCATION=Amsterdam  WEATHER_LAT=52.37  WEATHER_LON=4.89
const LAT  = parseFloat(process.env.WEATHER_LAT      ?? "52.37");
const LON  = parseFloat(process.env.WEATHER_LON      ?? "4.89");
const NAME =            process.env.WEATHER_LOCATION ?? "Amsterdam";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — weather changes slowly

// ── Types ───────────────────────────────────────────────────────────────────
export interface ForecastDay {
  date: string;  // YYYY-MM-DD
  code: number;
  desc: string;
  maxC: number;
  minC: number;
}

export interface WeatherData {
  location: string;
  tempC: number;
  feelsLikeC: number;
  code: number;
  desc: string;
  humidity: number;
  windKmph: number;
  forecast: ForecastDay[]; // 3 days including today
}

// ── WMO weather code → human description ────────────────────────────────────
const WMO: Record<number, string> = {
  0:  "Clear sky",
  1:  "Mainly clear",   2: "Partly cloudy",   3: "Overcast",
  45: "Foggy",         48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle",         55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Heavy freezing drizzle",
  61: "Light rain",    63: "Rain",            65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow",    73: "Snow",            75: "Heavy snow",  77: "Snow grains",
  80: "Rain showers",  81: "Heavy showers",   82: "Violent showers",
  85: "Snow showers",  86: "Heavy snow showers",
  95: "Thunderstorm",  96: "Thunderstorm + hail", 99: "Severe thunderstorm",
};

// ── Cache ────────────────────────────────────────────────────────────────────
let cache: { data: WeatherData; ts: number } | null = null;

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error("JSON parse error")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=Europe%2FAmsterdam&forecast_days=3`;

    const raw = await fetchJson(url) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const cur   = raw.current;
    const daily = raw.daily;

    const data: WeatherData = {
      location:    NAME,
      tempC:       Math.round(cur.temperature_2m),
      feelsLikeC:  Math.round(cur.apparent_temperature),
      code:        cur.weather_code as number,
      desc:        WMO[cur.weather_code as number] ?? "Unknown",
      humidity:    cur.relative_humidity_2m as number,
      windKmph:    Math.round(cur.wind_speed_10m),
      forecast:    (daily.time as string[]).map((date, i) => ({
        date,
        code: daily.weather_code[i] as number,
        desc: WMO[daily.weather_code[i] as number] ?? "Unknown",
        maxC: Math.round(daily.temperature_2m_max[i]),
        minC: Math.round(daily.temperature_2m_min[i]),
      })),
    };

    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Weather unavailable";
    res.status(500).json({ error: msg });
  }
}
