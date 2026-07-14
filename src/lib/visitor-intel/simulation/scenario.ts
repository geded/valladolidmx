/**
 * CV8.S.1 · SimulationScenario (Capa 1: Contratos).
 *
 * Contrato serializable de escenario. Reutilizable por futuras evoluciones
 * (Simulation Engine configurable — Founder Evolution Principle).
 *
 * NO contiene lógica de generación. Sólo describe QUÉ simular.
 */
import { z } from "zod";

export const SIMULATION_SCENARIO_SCHEMA_VERSION = "1.0.0" as const;

export const SimulationScaleSchema = z.enum(["light", "medium", "full"]);
export type SimulationScale = z.infer<typeof SimulationScaleSchema>;

/** Tamaños indicativos por escala (interpretados por el motor S.2). */
export const SCALE_VISITORS: Record<SimulationScale, number> = {
  light: 1_000,
  medium: 10_000,
  full: 100_000,
};

/** Catálogo mínimo de perfiles v1 (extensible en S.2). */
export const TravelerProfileIdSchema = z.enum([
  "couple_international",
  "couple_national",
  "family",
  "backpacker",
  "retirees",
  "gastronomic",
  "cultural",
  "nature",
  "luxury",
  "day_tripper",
  "hotel_guest",
  "self_drive",
]);
export type TravelerProfileId = z.infer<typeof TravelerProfileIdSchema>;

/** Propensiones por perfil (rangos 0..1). El motor S.2 las consume. */
export const ProfilePropensitiesSchema = z.object({
  exploration_depth: z.number().min(0).max(1),
  favorite_to_plan: z.number().min(0).max(1),
  concierge_acceptance: z.number().min(0).max(1),
  purchase_intent: z.number().min(0).max(1),
  weather_sensitivity: z.number().min(0).max(1),
  language_diversity: z.number().min(0).max(1),
  ticket_size_usd: z.tuple([z.number(), z.number()]),
});
export type ProfilePropensities = z.infer<typeof ProfilePropensitiesSchema>;

export const ProfileMixEntrySchema = z.object({
  profile: TravelerProfileIdSchema,
  weight: z.number().positive(),
  propensities: ProfilePropensitiesSchema,
});

export const CalendarConfigSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  weekend_boost: z.number().min(1).default(1.6),
  season_boost: z.record(z.string(), z.number()).default({}),
  rainy_day_probability: z.number().min(0).max(1).default(0.12),
});

export const DestinationDistributionSchema = z.object({
  primary_destination: z.string(), // slug ("valladolid")
  weights: z.record(z.string(), z.number().positive()),
});

export const PlantedIssuesSchema = z.object({
  early_abandonment_rate: z.number().min(0).max(1).default(0.08),
  low_conversion_categories: z.array(z.string()).default([]),
  wrong_language_rate: z.number().min(0).max(1).default(0.03),
  slow_business_response_rate: z.number().min(0).max(1).default(0.05),
  late_proposals_rate: z.number().min(0).max(1).default(0.04),
  underexplored_destinations: z.array(z.string()).default([]),
});

export const SimulationScenarioSchema = z.object({
  schema_version: z.literal(SIMULATION_SCENARIO_SCHEMA_VERSION),
  scenario_id: z.string().min(1),
  scenario_version: z.string().min(1),
  description: z.string().min(1),
  scale: SimulationScaleSchema,
  seed: z.string().min(1),
  calendar: CalendarConfigSchema,
  destinations: DestinationDistributionSchema,
  profile_mix: z.array(ProfileMixEntrySchema).min(1),
  planted_issues: PlantedIssuesSchema.default({
    early_abandonment_rate: 0.08,
    low_conversion_categories: [],
    wrong_language_rate: 0.03,
    slow_business_response_rate: 0.05,
    late_proposals_rate: 0.04,
    underexplored_destinations: [],
  }),
  locales: z.array(z.string()).min(1).default(["es"]),
});

export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;

/** Contrato de metadatos de una corrida (espejo de `visitor_intel.simulation_runs`). */
export const SimulationRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "wiped",
]);
export type SimulationRunStatus = z.infer<typeof SimulationRunStatusSchema>;

export const SimulationRunSchema = z.object({
  run_id: z.string().uuid(),
  scenario_id: z.string(),
  scenario_version: z.string(),
  seed: z.string(),
  scale: SimulationScaleSchema,
  scenario_payload: SimulationScenarioSchema,
  status: SimulationRunStatusSchema,
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  wiped_at: z.string().datetime().nullable(),
  rows_inserted: z.record(z.string(), z.number()).default({}),
  error_message: z.string().nullable(),
});
export type SimulationRun = z.infer<typeof SimulationRunSchema>;

/**
 * Envelope de aislamiento que TODO evento simulado debe llevar al insertarse
 * en `visitor_intel.events`. Cumple Founder Simulation Isolation Principle.
 */
export const SimulatedEventEnvelopeSchema = z.object({
  is_simulation: z.literal(true),
  simulation_run_id: z.string().uuid(),
});
export type SimulatedEventEnvelope = z.infer<typeof SimulatedEventEnvelopeSchema>;

/** Prefijo determinístico obligatorio para subject_id simulados. */
export function simulatedSubjectId(runId: string, n: number): string {
  const short = runId.replace(/-/g, "").slice(0, 8);
  return `sim_${short}_${n.toString(36)}`;
}

/** Selector de modo de consulta (Capa 4: Visualización). */
export const IntelligenceQueryModeSchema = z.enum([
  "real",
  "simulation",
  "combined",
]);
export type IntelligenceQueryMode = z.infer<typeof IntelligenceQueryModeSchema>;