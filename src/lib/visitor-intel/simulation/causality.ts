/**
 * CV8.S.2 · Reglas de causalidad de transiciones (Capa 2: Generación).
 *
 * Founder Scenario Coherence Principle · Regla de Causalidad:
 * cada transición T1..T9 declara prerequisito canónico, influencer típico
 * y ventana temporal razonable desde el evento anterior. La probabilidad
 * base la modula el perfil y las condiciones (weather, weekend, planted).
 */
import type { JourneyTransitionId } from "../journey";
import type { ProfilePropensities } from "./scenario";
import { HOUR_MS, MINUTE_MS, DAY_MS } from "./calendar";

export interface CausalityRule {
  id: JourneyTransitionId;
  /** Etapa previa esperada del sujeto. */
  from_stage: string;
  /** Influencer canónico (capability del sistema que interviene). */
  influencer: string;
  /** Prerequisito narrativo (para trazabilidad Explainable). */
  prerequisite: string;
  /** Ventana temporal mínima desde el evento anterior. */
  min_gap_ms: number;
  /** Ventana temporal máxima desde el evento anterior. */
  max_gap_ms: number;
  /** Probabilidad base — modulada por perfil y contexto. */
  base_probability: (p: ProfilePropensities) => number;
}

export const CAUSALITY_RULES: Readonly<Record<JourneyTransitionId, CausalityRule>> = {
  T1_stranger_to_anonymous: {
    id: "T1_stranger_to_anonymous",
    from_stage: "stranger",
    influencer: "landing",
    prerequisite: "session_started",
    min_gap_ms: 0,
    max_gap_ms: 5 * MINUTE_MS,
    base_probability: () => 1, // toda visita inicia sesión anónima
  },
  T2_anonymous_to_identified: {
    id: "T2_anonymous_to_identified",
    from_stage: "anonymous",
    influencer: "ac1_moments",
    prerequisite: "value_delivered_before_ask",
    min_gap_ms: 2 * MINUTE_MS,
    max_gap_ms: 3 * DAY_MS,
    base_probability: (p) => 0.15 + 0.25 * p.favorite_to_plan,
  },
  T3_identified_to_explorer: {
    id: "T3_identified_to_explorer",
    from_stage: "identified",
    influencer: "discovery",
    prerequisite: "deep_content_consumed",
    min_gap_ms: 30_000,
    max_gap_ms: 2 * DAY_MS,
    base_probability: (p) => 0.5 + 0.35 * p.exploration_depth,
  },
  T4_explorer_to_interested: {
    id: "T4_explorer_to_interested",
    from_stage: "explorer",
    influencer: "favorite",
    prerequisite: "intent_signal_captured",
    min_gap_ms: 1 * MINUTE_MS,
    max_gap_ms: 5 * DAY_MS,
    base_probability: (p) => 0.35 + 0.4 * p.favorite_to_plan,
  },
  T5_interested_to_travel_plan: {
    id: "T5_interested_to_travel_plan",
    from_stage: "interested",
    influencer: "travel_plan_bridge",
    prerequisite: "add_to_plan_confirmed",
    min_gap_ms: 5 * MINUTE_MS,
    max_gap_ms: 7 * DAY_MS,
    base_probability: (p) => 0.25 + 0.5 * p.favorite_to_plan,
  },
  T6_travel_plan_to_concierge: {
    id: "T6_travel_plan_to_concierge",
    from_stage: "travel_plan",
    influencer: "promote_plan_to_case",
    prerequisite: "plan_ready_for_expert",
    min_gap_ms: 30 * MINUTE_MS,
    max_gap_ms: 10 * DAY_MS,
    base_probability: (p) => 0.15 + 0.5 * p.concierge_acceptance,
  },
  T7_concierge_to_reservation: {
    id: "T7_concierge_to_reservation",
    from_stage: "concierge",
    influencer: "concierge_proposal",
    prerequisite: "proposal_accepted_and_paid",
    min_gap_ms: 2 * HOUR_MS,
    max_gap_ms: 12 * DAY_MS,
    base_probability: (p) => 0.2 + 0.55 * p.purchase_intent,
  },
  T8_reservation_to_traveler: {
    id: "T8_reservation_to_traveler",
    from_stage: "reservation",
    influencer: "live_day",
    prerequisite: "trip_started_in_destination",
    min_gap_ms: 1 * DAY_MS,
    max_gap_ms: 45 * DAY_MS,
    base_probability: () => 0.95, // casi todos viajan tras reservar
  },
  T9_traveler_to_ambassador: {
    id: "T9_traveler_to_ambassador",
    from_stage: "traveler",
    influencer: "post_trip_loop",
    prerequisite: "advocacy_action_taken",
    min_gap_ms: 1 * DAY_MS,
    max_gap_ms: 30 * DAY_MS,
    base_probability: (p) => 0.15 + 0.35 * p.concierge_acceptance,
  },
};

export const CANONICAL_ORDER: readonly JourneyTransitionId[] = [
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