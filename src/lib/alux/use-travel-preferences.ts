/**
 * Lectura reactiva de las preferencias de viaje recordadas por Alux.
 * Reutiliza `useAluxMemory` (única autoridad local) y el vocabulario
 * cerrado de `travel-preferences`. SSR-safe: vacío hasta hidratar.
 */
import { useMemo } from "react";
import { useAluxMemory } from "./use-alux-memory";
import { readTravelPreferences, type TravelPreference } from "./travel-preferences";

export function useTravelPreferences(): readonly TravelPreference[] {
  const { hydrated, summary } = useAluxMemory();
  return useMemo(() => (hydrated ? readTravelPreferences(summary) : []), [hydrated, summary]);
}
