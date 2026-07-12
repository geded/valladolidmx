/**
 * Ola A10 · Clima real (Open-Meteo)
 *
 * Helper server-only para obtener clima actual y probabilidad de lluvia
 * de las próximas horas para una coordenada del Oriente Maya.
 *
 * Open-Meteo es gratuito, sin API key y sin límite estricto para uso
 * razonable. Cachéamos in-memory 15 min por celda geográfica (redondeo
 * a 2 decimales ≈ 1 km) para evitar hammering desde el worker.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; data: WeatherSnapshot }>();

export type WeatherSnapshot = {
  tempC: number;
  feelsLikeC: number | null;
  code: number;
  label: string; // "soleado", "nublado", "lluvia ligera", etc.
  icon: string; // emoji corto
  rainChanceNext6h: number; // %
  tempMaxC: number | null;
  tempMinC: number | null;
  isDay: boolean;
  fetchedAt: string; // ISO
};

// Códigos WMO simplificados a español coloquial.
function describeWmo(code: number, isDay: boolean): { label: string; icon: string } {
  if (code === 0) return { label: isDay ? "soleado" : "despejado", icon: isDay ? "☀️" : "🌙" };
  if (code === 1) return { label: "mayormente despejado", icon: isDay ? "🌤️" : "🌙" };
  if (code === 2) return { label: "parcialmente nublado", icon: "⛅" };
  if (code === 3) return { label: "nublado", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "niebla", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "llovizna", icon: "🌦️" };
  if (code >= 61 && code <= 65) return { label: "lluvia", icon: "🌧️" };
  if (code >= 66 && code <= 67) return { label: "lluvia helada", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "nieve", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "chubascos", icon: "🌦️" };
  if (code >= 95 && code <= 99) return { label: "tormenta eléctrica", icon: "⛈️" };
  return { label: "condiciones variables", icon: "🌡️" };
}

function cellKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function fetchWeatherCached(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = cellKey(lat, lon);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=temperature_2m,apparent_temperature,weather_code,is_day` +
      `&hourly=precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&forecast_hours=6&forecast_days=1&timezone=America%2FMerida`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        is_day?: number;
      };
      hourly?: { precipitation_probability?: Array<number | null> };
      daily?: {
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
      };
    };
    const cur = json.current;
    if (!cur || typeof cur.temperature_2m !== "number") return null;
    const isDay = cur.is_day !== 0;
    const desc = describeWmo(cur.weather_code ?? 0, isDay);
    const probs = (json.hourly?.precipitation_probability ?? [])
      .filter((v): v is number => typeof v === "number");
    const rainChanceNext6h = probs.length > 0 ? Math.max(...probs) : 0;
    const snapshot: WeatherSnapshot = {
      tempC: Math.round(cur.temperature_2m),
      feelsLikeC:
        typeof cur.apparent_temperature === "number"
          ? Math.round(cur.apparent_temperature)
          : null,
      code: cur.weather_code ?? 0,
      label: desc.label,
      icon: desc.icon,
      rainChanceNext6h: Math.round(rainChanceNext6h),
      tempMaxC:
        typeof json.daily?.temperature_2m_max?.[0] === "number"
          ? Math.round(json.daily.temperature_2m_max[0] as number)
          : null,
      tempMinC:
        typeof json.daily?.temperature_2m_min?.[0] === "number"
          ? Math.round(json.daily.temperature_2m_min[0] as number)
          : null,
      isDay,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, { at: now, data: snapshot });
    return snapshot;
  } catch {
    return null;
  }
}

export function weatherToPromptBlock(
  weather: WeatherSnapshot | null,
  source: "gps" | "destino",
  destinationName?: string | null,
): string {
  if (!weather) return "";
  const where =
    source === "gps"
      ? "en la ubicación compartida del visitante"
      : `en ${destinationName ?? "el destino activo"}`;
  const feels =
    weather.feelsLikeC !== null && Math.abs(weather.feelsLikeC - weather.tempC) >= 2
      ? ` (sensación ${weather.feelsLikeC}°C)`
      : "";
  const range =
    weather.tempMinC !== null && weather.tempMaxC !== null
      ? ` Rango del día: ${weather.tempMinC}°C – ${weather.tempMaxC}°C.`
      : "";
  const rain =
    weather.rainChanceNext6h >= 50
      ? ` Alta probabilidad de lluvia en las próximas 6 h (${weather.rainChanceNext6h}%): sugiere planes bajo techo (museos, gastronomía, spa, mercados, talleres).`
      : weather.rainChanceNext6h >= 25
        ? ` Probabilidad moderada de lluvia (${weather.rainChanceNext6h}%): prever plan B.`
        : " Baja probabilidad de lluvia: buen momento para cenotes, ruinas y exteriores.";
  return (
    `[CLIMA AHORA] ${where}: ${weather.tempC}°C, ${weather.label}${feels}.${range}${rain}` +
    ` Usa este dato para ajustar recomendaciones (calor intenso ≥33°C = cenote/sombra/hidratación; lluvia = interiores; noche despejada = paseo por el centro). Nunca contradigas este clima real.`
  );
}