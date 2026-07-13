import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTripWeather, type TripDayWeather } from "@/lib/traveler/weather.functions";

/**
 * CV5.6 · Chip de clima por día para el Timeline.
 * Comparte una única consulta por (startDate, days) — todos los chips
 * del itinerario reutilizan la misma respuesta cacheada.
 */

function iconForCode(code: number | null): string {
  if (code === null) return "🌤️";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌦️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function labelForCode(code: number | null): string {
  if (code === null) return "Sin dato";
  if (code === 0) return "Despejado";
  if (code <= 2) return "Mayormente despejado";
  if (code === 3) return "Nublado";
  if (code >= 45 && code <= 48) return "Niebla";
  if (code >= 51 && code <= 67) return "Lluvia ligera";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code >= 95) return "Tormenta";
  return "Parcialmente nublado";
}

function useTripForecast(startDate: string | null, days: number) {
  const fn = useServerFn(getTripWeather);
  return useQuery({
    enabled: Boolean(startDate) && days > 0,
    queryKey: ["trip-weather", startDate, days],
    queryFn: () => fn({ data: { startDate: startDate as string, days } }),
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 6 * 60 * 60 * 1000,
  });
}

type Props = {
  startDate: string | null;
  totalDays: number;
  dayIndex: number;
};

export function DayWeatherChip({ startDate, totalDays, dayIndex }: Props) {
  const q = useTripForecast(startDate, totalDays);
  if (!startDate) return null;
  const day: TripDayWeather | undefined = q.data?.days?.[dayIndex];
  if (q.isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill border border-border/50 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
        <span className="size-1 animate-pulse rounded-full bg-primary/50" aria-hidden />
        Clima…
      </span>
    );
  }
  if (!day || (day.tmax === null && day.tmin === null)) return null;
  const tmax = day.tmax !== null ? Math.round(day.tmax) : null;
  const tmin = day.tmin !== null ? Math.round(day.tmin) : null;
  const rain = day.precipMm && day.precipMm >= 1 ? ` · ${Math.round(day.precipMm)}mm` : "";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
      title={`${labelForCode(day.code)}${rain} · Valladolid`}
    >
      <span aria-hidden>{iconForCode(day.code)}</span>
      <span className="tabular-nums">
        {tmax !== null ? `${tmax}°` : ""}
        {tmin !== null ? <span className="ml-0.5 text-muted-foreground/70">/ {tmin}°</span> : null}
      </span>
    </span>
  );
}
