/**
 * CV6.4 · Weather Contributor (stub arquitectónico).
 *
 * Publica la señal `weather` conforme al contrato canónico. La
 * implementación real reutiliza `fetchWeatherCached` (Open-Meteo) —
 * server-only. Aquí exponemos el Contributor y su payload tipado; la
 * activación en runtime (registro efectivo) queda a cargo del arranque
 * server, no de superficies.
 */
import type {
  DestinationContextContributor,
  DestinationSignal,
} from "../types";

export interface WeatherSignalPayload {
  tempC: number;
  feelsLikeC: number | null;
  label: string;
  icon: string;
  rainChanceNext6h: number;
  tempMaxC: number | null;
  tempMinC: number | null;
  isDay: boolean;
}

const TTL_MS = 15 * 60 * 1000;

export const weatherContributor: DestinationContextContributor = {
  id: "destination.weather.open-meteo",
  kind: "weather",
  async resolve({ scope, at }) {
    if (!scope.geo) return [];
    try {
      const mod = await import("@/lib/alux/weather.server");
      const w = await mod.fetchWeatherCached(scope.geo.lat, scope.geo.lon);
      if (!w) return [];
      const payload: WeatherSignalPayload = {
        tempC: w.tempC,
        feelsLikeC: w.feelsLikeC,
        label: w.label,
        icon: w.icon,
        rainChanceNext6h: w.rainChanceNext6h,
        tempMaxC: w.tempMaxC,
        tempMinC: w.tempMinC,
        isDay: w.isDay,
      };
      const sig: DestinationSignal<WeatherSignalPayload> = {
        kind: "weather",
        scope,
        at: at.toISOString(),
        ttlMs: TTL_MS,
        explain: {
          rationale: `Clima actual: ${w.tempC}°C, ${w.label}. Lluvia próximas 6h: ${w.rainChanceNext6h}%.`,
          provider: "Open-Meteo",
          url: "https://open-meteo.com",
        },
        payload,
      };
      return [sig];
    } catch {
      return [];
    }
  },
};
