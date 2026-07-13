import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * CV5.6 · Weather per day
 * Open-Meteo forecast (no API key) para Valladolid, Yucatán.
 * Devuelve resumen diario para el rango del viaje.
 */

const VALLADOLID = { lat: 20.6889, lon: -88.2011 } as const;

export type TripDayWeather = {
  date: string; // YYYY-MM-DD
  tmin: number | null;
  tmax: number | null;
  code: number | null;
  precipMm: number | null;
};

const InputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(16),
});

export const getTripWeather = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ days: TripDayWeather[] }> => {
    const start = data.startDate;
    // Compute end date (inclusive)
    const startMs = Date.parse(`${start}T00:00:00Z`);
    if (Number.isNaN(startMs)) return { days: [] };
    const endMs = startMs + (data.days - 1) * 86_400_000;
    const end = new Date(endMs).toISOString().slice(0, 10);

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(VALLADOLID.lat));
    url.searchParams.set("longitude", String(VALLADOLID.lon));
    url.searchParams.set(
      "daily",
      "temperature_2m_min,temperature_2m_max,weather_code,precipitation_sum",
    );
    url.searchParams.set("timezone", "America/Merida");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    try {
      const res = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return { days: [] };
      const json = (await res.json()) as {
        daily?: {
          time?: string[];
          temperature_2m_min?: number[];
          temperature_2m_max?: number[];
          weather_code?: number[];
          precipitation_sum?: number[];
        };
      };
      const t = json.daily?.time ?? [];
      const tmin = json.daily?.temperature_2m_min ?? [];
      const tmax = json.daily?.temperature_2m_max ?? [];
      const code = json.daily?.weather_code ?? [];
      const precip = json.daily?.precipitation_sum ?? [];
      const days: TripDayWeather[] = t.map((date, i) => ({
        date,
        tmin: typeof tmin[i] === "number" ? tmin[i] : null,
        tmax: typeof tmax[i] === "number" ? tmax[i] : null,
        code: typeof code[i] === "number" ? code[i] : null,
        precipMm: typeof precip[i] === "number" ? precip[i] : null,
      }));
      return { days };
    } catch {
      return { days: [] };
    }
  });
