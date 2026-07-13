/**
 * useTravelStage (CV6.O2) — hook cliente que resuelve la etapa actual
 * del viajero reutilizando EXCLUSIVAMENTE `deriveTravelStage` (contrato
 * v1.0.0 congelado en CV6.O1). Sin nueva persistencia, sin nueva
 * infraestructura, sin lógica de motor paralela.
 *
 * Fuentes:
 *  - perfil turístico mínimo (para distinguir Inspiración vs Exploración)
 *  - Travel Plan (para Planeación / Pre-viaje / En destino / Post-viaje)
 *  - override `?stage=` en el search de la URL para el Stage Simulator
 */
import { useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  deriveTravelStage,
  type TravelStage,
} from "@/lib/traveler/journey-stage";
import type { TravelerProfile } from "@/lib/traveler/traveler-account.functions";

const VALID: readonly TravelStage[] = [
  "inspiration",
  "exploration",
  "planning",
  "pre_trip",
  "on_trip",
  "post_trip",
];

function parseOverride(search: unknown): TravelStage | null {
  if (!search || typeof search !== "object") return null;
  const v = (search as Record<string, unknown>).stage;
  if (typeof v !== "string") return null;
  return (VALID as readonly string[]).includes(v) ? (v as TravelStage) : null;
}

export interface TravelStageSources {
  profile: TravelerProfile | null | undefined;
  hasTravelPlan?: boolean;
  hasPlanItems?: boolean;
  hasActiveTrip?: boolean;
  daysUntilStart?: number | null;
  daysAfterEnd?: number | null;
}

export interface ResolvedTravelStage {
  stage: TravelStage;
  override: boolean;
}

export function useTravelStage(sources: TravelStageSources): ResolvedTravelStage {
  const search = useRouterState({ select: (s) => s.location.search });

  return useMemo(() => {
    const override = parseOverride(search);
    if (override) return { stage: override, override: true };
    const p = sources.profile ?? null;
    const hasCompletedProfile = Boolean(
      p &&
        (p.travel_style || (p.interests?.length ?? 0) > 0 || p.trip_context?.travel_window),
    );
    return {
      stage: deriveTravelStage({
        hasCompletedProfile,
        hasTravelPlan: sources.hasTravelPlan,
        hasPlanItems: sources.hasPlanItems,
        hasActiveTrip: sources.hasActiveTrip,
        daysUntilStart: sources.daysUntilStart ?? null,
        daysAfterEnd: sources.daysAfterEnd ?? null,
      }),
      override: false,
    };
  }, [
    search,
    sources.profile,
    sources.hasTravelPlan,
    sources.hasPlanItems,
    sources.hasActiveTrip,
    sources.daysUntilStart,
    sources.daysAfterEnd,
  ]);
}