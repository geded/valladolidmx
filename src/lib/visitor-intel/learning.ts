/**
 * CV8.0 · Journey Contracts — Learning-Ready Schema v1.0.0.
 *
 * Implementa la Regla de Aprendizaje del Founder Journey Optimization
 * Principle: toda transición del Journey queda preparada para que futuras
 * capacidades de IA puedan aprender qué intervenciones aumentan la
 * probabilidad de avance.
 *
 * CV8.0 NO implementa modelos de ML. Este archivo sólo describe la forma
 * canónica del "ejemplo de entrenamiento" que sub-olas futuras (CV8.9+)
 * podrán construir a partir de eventos append-only.
 */
import { z } from "zod";

import type { JourneyTransitionId } from "./journey";

export const LEARNING_SCHEMA_VERSION = "1.0.0" as const;

/**
 * Intervención = capacidad del sistema aplicada al viajero con la hipótesis
 * de acelerar una transición específica.
 */
export const InterventionSchema = z.object({
  intervention_id: z.string().uuid(),
  capability: z.string(), // "alux" | "concierge" | "decision_center" | "hero" | ...
  action: z.string(),     // "suggestion" | "proposal" | "recommendation" | "cta" | ...
  target_transition: z.string(), // JourneyTransitionId
  offered_at: z.string().datetime(),
  rationale: z.string().optional(), // Explainable by Default
});

/** Contexto observable al momento de aplicar la intervención. */
export const InterventionContextSchema = z.object({
  stage_before: z.string(), // VisitorStage
  trust_level: z.string(),
  destination_id: z.string().uuid().nullable().optional(),
  travel_stage: z.string().optional(),
  live_day_phase: z.string().optional(),
  /** Señales agregadas del Context Engine (clima, tráfico, hours, etc.). */
  context_signals: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

/** Resultado observado tras la intervención (ventana definida por sub-ola). */
export const InterventionOutcomeSchema = z.object({
  transition_occurred: z.boolean(),
  time_to_transition_ms: z.number().nullable().optional(),
  traveler_value: z.number().min(0).max(1).nullable().optional(),
  ecosystem_value: z.number().min(0).max(1).nullable().optional(),
  /** Etiqueta de éxito interpretable por analistas humanos. */
  label: z.enum(["advanced", "no_change", "regressed", "abandoned"]),
});

/**
 * Ejemplo de aprendizaje — tupla (intervención, contexto, resultado) sobre
 * una transición canónica del Journey. Append-only. Servirá de insumo para
 * modelos futuros de recomendación/priorización.
 */
export const LearningExampleSchema = z.object({
  example_id: z.string().uuid(),
  schema_version: z.literal(LEARNING_SCHEMA_VERSION),
  subject_id: z.string(), // agregable, k-anonymity ≥25 exigido en dashboards
  transition: z.string(), // JourneyTransitionId
  intervention: InterventionSchema,
  context: InterventionContextSchema,
  outcome: InterventionOutcomeSchema,
  created_at: z.string().datetime(),
});

export type Intervention = z.infer<typeof InterventionSchema>;
export type InterventionContext = z.infer<typeof InterventionContextSchema>;
export type InterventionOutcome = z.infer<typeof InterventionOutcomeSchema>;
export type LearningExample = z.infer<typeof LearningExampleSchema> & {
  transition: JourneyTransitionId;
};

/**
 * Guardrail declarativo: toda transición canónica DEBE ser aprendible.
 * Sub-olas futuras (CV8.9+) que definan pipelines de aprendizaje deberán
 * declarar cobertura para las 9 transiciones o justificar la exclusión.
 */
export const LEARNABLE_TRANSITIONS: readonly JourneyTransitionId[] = [
  "T1_stranger_to_anonymous",
  "T2_anonymous_to_identified",
  "T3_identified_to_explorer",
  "T4_explorer_to_interested",
  "T5_interested_to_travel_plan",
  "T6_travel_plan_to_concierge",
  "T7_concierge_to_reservation",
  "T8_reservation_to_traveler",
  "T9_traveler_to_ambassador",
];
