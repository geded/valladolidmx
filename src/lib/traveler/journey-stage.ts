/**
 * Journey Stage (CV6.O1) — helper canónico de etapa del viajero.
 *
 * Implementa Founder Travel Lifecycle Principle + Founder Daily Value Principle.
 * Etapa 100% derivada — no persiste modelo nuevo. Fuentes: Travel Plan + Live Day
 * + Passport + señales locales del perfil.
 *
 * Contrato público v1.0.0 (congelado): `TravelStage`, `deriveTravelStage`,
 * `getDailyMission`, `stageAllowsPermission`.
 */

export type TravelStage =
  | "inspiration"
  | "exploration"
  | "planning"
  | "pre_trip"
  | "on_trip"
  | "post_trip";

export interface TravelStageInput {
  /** El viajero ya creó un Travel Plan activo. */
  hasTravelPlan?: boolean;
  /** El viajero tiene items agregados al plan. */
  hasPlanItems?: boolean;
  /** El viajero se encuentra hoy dentro de las fechas del viaje. */
  hasActiveTrip?: boolean;
  /** Días hacia el inicio del viaje (null si no hay fechas). Negativo = ya inició. */
  daysUntilStart?: number | null;
  /** Días transcurridos desde el fin (null si no aplica). */
  daysAfterEnd?: number | null;
  /** Perfil turístico mínimo capturado (idioma + ventana + party). */
  hasCompletedProfile?: boolean;
}

export function deriveTravelStage(input: TravelStageInput): TravelStage {
  const {
    hasTravelPlan,
    hasPlanItems,
    hasActiveTrip,
    daysUntilStart,
    daysAfterEnd,
    hasCompletedProfile,
  } = input;

  if (hasActiveTrip) return "on_trip";
  if (daysAfterEnd != null && daysAfterEnd >= 0 && daysAfterEnd <= 30) return "post_trip";
  if (daysUntilStart != null && daysUntilStart >= 0 && daysUntilStart <= 14) return "pre_trip";
  if (hasTravelPlan && hasPlanItems) return "planning";
  if (hasCompletedProfile) return "exploration";
  return "inspiration";
}

export interface DailyMission {
  stage: TravelStage;
  headline: string;
  subline: string;
  ctaLabel: string;
  ctaKind: "discover" | "explore" | "plan" | "prepare" | "live" | "remember";
}

const MISSIONS: Record<TravelStage, DailyMission> = {
  inspiration: {
    stage: "inspiration",
    headline: "Descubre un nuevo destino",
    subline: "Deja que el Oriente Maya te sorprenda hoy.",
    ctaLabel: "Explorar Oriente Maya",
    ctaKind: "discover",
  },
  exploration: {
    stage: "exploration",
    headline: "Encuentra experiencias que te gustarán",
    subline: "Basado en lo que ya sabemos de ti.",
    ctaLabel: "Ver recomendaciones",
    ctaKind: "explore",
  },
  planning: {
    stage: "planning",
    headline: "Completa tu itinerario",
    subline: "Alux te ayuda a decidir qué falta.",
    ctaLabel: "Continuar mi viaje",
    ctaKind: "plan",
  },
  pre_trip: {
    stage: "pre_trip",
    headline: "Revisa lo que falta antes de salir",
    subline: "Documentos, reservas y llegada bajo control.",
    ctaLabel: "Prepararme",
    ctaKind: "prepare",
  },
  on_trip: {
    stage: "on_trip",
    headline: "Esto es lo más importante para hoy",
    subline: "Tu compañero en tiempo real en el destino.",
    ctaLabel: "Ver mi día",
    ctaKind: "live",
  },
  post_trip: {
    stage: "post_trip",
    headline: "Conserva tus recuerdos y prepara el siguiente viaje",
    subline: "Tu Pasaporte de Viajero Alux se enriquece con cada experiencia.",
    ctaLabel: "Ver mi Pasaporte",
    ctaKind: "remember",
  },
};

export function getDailyMission(stage: TravelStage): DailyMission {
  return MISSIONS[stage];
}

/**
 * Founder Travel Companion First: los permisos del navegador SOLO son
 * elegibles en las etapas donde su beneficio es evidente e inmediato.
 */
export function stageAllowsPermission(
  stage: TravelStage,
  permission: "geolocation" | "notifications" | "camera",
): boolean {
  switch (permission) {
    case "geolocation":
      return stage === "pre_trip" || stage === "on_trip";
    case "notifications":
      return stage === "planning" || stage === "pre_trip" || stage === "on_trip";
    case "camera":
      return stage === "on_trip" || stage === "post_trip";
  }
}