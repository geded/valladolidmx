/**
 * CV8.S.4 · Escenario oficial `oriente-maya-90d` (v1.0.0).
 *
 * Fábrica determinística: dada una `seed` y `scale`, devuelve un
 * `SimulationScenario` v1.0.0 listo para el motor.
 *
 * Fuente única de configuración base para la UI admin.
 */
import type { SimulationScenario, SimulationScale } from "../scenario";
import {
  SimulationScenarioSchema,
  SIMULATION_SCENARIO_SCHEMA_VERSION,
} from "../scenario";
import { PROFILE_CATALOG } from "../profiles";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Mezcla base — pesos calibrados para Oriente Maya (Valladolid como base). */
const BASE_MIX = [
  { profile: "couple_international", weight: 18 },
  { profile: "couple_national", weight: 15 },
  { profile: "family", weight: 14 },
  { profile: "backpacker", weight: 8 },
  { profile: "retirees", weight: 8 },
  { profile: "gastronomic", weight: 9 },
  { profile: "cultural", weight: 10 },
  { profile: "nature", weight: 7 },
  { profile: "luxury", weight: 3 },
  { profile: "day_tripper", weight: 4 },
  { profile: "hotel_guest", weight: 2 },
  { profile: "self_drive", weight: 2 },
] as const;

export const DEFAULT_SCENARIO_ID = "oriente-maya-90d" as const;
export const DEFAULT_SCENARIO_VERSION = "1.0.0" as const;

export function buildOrienteMayaScenario(params: {
  seed: string;
  scale: SimulationScale;
  endDate?: Date;
}): SimulationScenario {
  const end = params.endDate ?? new Date();
  const start = new Date(end.getTime() - NINETY_DAYS_MS);
  const scenario: SimulationScenario = {
    schema_version: SIMULATION_SCENARIO_SCHEMA_VERSION,
    scenario_id: DEFAULT_SCENARIO_ID,
    scenario_version: DEFAULT_SCENARIO_VERSION,
    description:
      "Operación realista del Oriente Maya de Yucatán durante ~90 días con Valladolid como base y excursiones territoriales.",
    scale: params.scale,
    seed: params.seed,
    calendar: {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      weekend_boost: 1.6,
      season_boost: {},
      rainy_day_probability: 0.12,
    },
    destinations: {
      primary_destination: "valladolid",
      weights: {
        valladolid: 60,
        "chichen-itza": 12,
        "ek-balam": 8,
        izamal: 6,
        "rio-lagartos": 5,
        "las-coloradas": 5,
        espita: 4,
      },
    },
    profile_mix: BASE_MIX.map((entry) => ({
      profile: entry.profile,
      weight: entry.weight,
      propensities: PROFILE_CATALOG[entry.profile].propensities,
    })),
    planted_issues: {
      early_abandonment_rate: 0.08,
      low_conversion_categories: [],
      wrong_language_rate: 0.03,
      slow_business_response_rate: 0.05,
      late_proposals_rate: 0.04,
      underexplored_destinations: [],
    },
    locales: ["es", "en", "fr"],
  };
  return SimulationScenarioSchema.parse(scenario);
}

/** Estimación aproximada del volumen previo a ejecución (para preview UI). */
export function estimateVolume(scale: SimulationScale): {
  visitors: number;
  events_low: number;
  events_high: number;
  storage_mb_low: number;
  storage_mb_high: number;
} {
  const visitors = scale === "light" ? 1_000 : scale === "medium" ? 10_000 : 100_000;
  // Promedio observado en CV8.S.3: ~12–22 eventos por visitante (Journey + sub-motores).
  const low = visitors * 12;
  const high = visitors * 22;
  // ~1.2 KB por row en jsonb (payload + causality).
  return {
    visitors,
    events_low: low,
    events_high: high,
    storage_mb_low: Math.round((low * 1.2) / 1024),
    storage_mb_high: Math.round((high * 1.2) / 1024),
  };
}