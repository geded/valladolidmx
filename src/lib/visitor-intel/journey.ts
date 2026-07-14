/**
 * CV8.0 · Journey Contracts — Visitor Journey oficial (v1.0.0, congelado).
 *
 * Implementa Founder Visitor Intelligence Principle + Founder Journey
 * Optimization Principle. Este módulo es CONTRATO — no ejecuta lógica de
 * negocio, no persiste eventos, no implementa modelos de ML. Sólo define la
 * estructura sobre la que evolucionará Visitor Intelligence Platform.
 *
 * Fuente única de las 10 etapas y sus 9 transiciones canónicas. Prohibido
 * inventar embudos paralelos o renombrar etapas.
 */

export const VISITOR_JOURNEY_CONTRACT_VERSION = "1.0.0" as const;

/** 10 etapas oficiales del Visitor Journey (orden canónico). */
export type VisitorStage =
  | "stranger"      // 0 · Extraño — impresión externa sin sesión
  | "anonymous"     // 1 · Anónimo — primera sesión sin identidad
  | "identified"    // 2 · Identificado — provee email/tel o sign-in
  | "explorer"      // 3 · Explorador — consumo con profundidad
  | "interested"    // 4 · Interesado — señales de intención (fav/save/compare)
  | "travel_plan"   // 5 · Travel Plan — plan propio con ≥1 item real
  | "concierge"     // 6 · Concierge — plan promovido a caso
  | "reservation"   // 7 · Reserva — orden/reserva confirmada
  | "traveler"      // 8 · Viajero — Live Day activo o estancia completada
  | "ambassador";   // 9 · Embajador — acción post-viaje que ayuda a otros

export const VISITOR_STAGES: readonly VisitorStage[] = [
  "stranger",
  "anonymous",
  "identified",
  "explorer",
  "interested",
  "travel_plan",
  "concierge",
  "reservation",
  "traveler",
  "ambassador",
] as const;

/** Índice ordinal 0..9 de la etapa. */
export function stageIndex(stage: VisitorStage): number {
  return VISITOR_STAGES.indexOf(stage);
}

/**
 * Identificador canónico de una transición del Journey (T1..T9).
 * Prohibido inventar transiciones fuera de esta enumeración.
 */
export type JourneyTransitionId =
  | "T1_stranger_to_anonymous"
  | "T2_anonymous_to_identified"
  | "T3_identified_to_explorer"
  | "T4_explorer_to_interested"
  | "T5_interested_to_travel_plan"
  | "T6_travel_plan_to_concierge"
  | "T7_concierge_to_reservation"
  | "T8_reservation_to_traveler"
  | "T9_traveler_to_ambassador";

export interface JourneyTransition {
  id: JourneyTransitionId;
  from: VisitorStage;
  to: VisitorStage;
  /** Preguntas Founder que esta transición debe permitir responder. */
  helps_answer: readonly string[];
  /** Capacidades del sistema conocidas que la influyen. Evolutivo. */
  known_influencers: readonly string[];
  /** Umbral mínimo canónico para considerar la transición efectuada. */
  entry_signal: string;
}

export const JOURNEY_TRANSITIONS: Readonly<Record<JourneyTransitionId, JourneyTransition>> = {
  T1_stranger_to_anonymous: {
    id: "T1_stranger_to_anonymous",
    from: "stranger",
    to: "anonymous",
    helps_answer: ["¿Qué canales atraen visitantes reales al Oriente Maya?"],
    known_influencers: ["seo", "social", "referral", "landing"],
    entry_signal: "visitor.session.started",
  },
  T2_anonymous_to_identified: {
    id: "T2_anonymous_to_identified",
    from: "anonymous",
    to: "identified",
    helps_answer: [
      "¿Qué momento de valor convierte a un anónimo en identificado?",
      "¿Qué invitaciones (AC1.4) son más efectivas?",
    ],
    known_influencers: ["ac1_moments", "continuity_recognition", "first_five_seconds"],
    entry_signal: "visitor.identified",
  },
  T3_identified_to_explorer: {
    id: "T3_identified_to_explorer",
    from: "identified",
    to: "explorer",
    helps_answer: ["¿Qué contenido genera exploración profunda del destino?"],
    known_influencers: ["discovery", "tourist_hero", "recommendations", "alux"],
    entry_signal: "journey.exploration.deepened",
  },
  T4_explorer_to_interested: {
    id: "T4_explorer_to_interested",
    from: "explorer",
    to: "interested",
    helps_answer: [
      "¿Qué provoca la primera señal de intención?",
      "¿Qué empresas/productos/destinos generan intención?",
    ],
    known_influencers: ["favorite", "add_to_plan", "compare", "alux_suggestion"],
    entry_signal: "intent.signal.captured",
  },
  T5_interested_to_travel_plan: {
    id: "T5_interested_to_travel_plan",
    from: "interested",
    to: "travel_plan",
    helps_answer: ["¿Qué provoca la creación de un Travel Plan?"],
    known_influencers: ["travel_plan_bridge", "alux_proposal", "concierge_voice"],
    entry_signal: "plan.created",
  },
  T6_travel_plan_to_concierge: {
    id: "T6_travel_plan_to_concierge",
    from: "travel_plan",
    to: "concierge",
    helps_answer: ["¿Qué eleva un plan a caso de Concierge?"],
    known_influencers: ["promote_plan_to_case", "alux_intent", "high_intent"],
    entry_signal: "plan.promoted_to_case",
  },
  T7_concierge_to_reservation: {
    id: "T7_concierge_to_reservation",
    from: "concierge",
    to: "reservation",
    helps_answer: [
      "¿Qué acciones del Concierge incrementan la conversión?",
      "¿Qué propuestas generan mayor aceptación?",
    ],
    known_influencers: ["concierge_proposal", "checkout_narrative", "trust_signals"],
    entry_signal: "order.confirmed",
  },
  T8_reservation_to_traveler: {
    id: "T8_reservation_to_traveler",
    from: "reservation",
    to: "traveler",
    helps_answer: ["¿Qué preparación aumenta la satisfacción en destino?"],
    known_influencers: ["pre_trip_prep", "live_day", "onsite_context"],
    entry_signal: "livejourney.onsite",
  },
  T9_traveler_to_ambassador: {
    id: "T9_traveler_to_ambassador",
    from: "traveler",
    to: "ambassador",
    helps_answer: [
      "¿Qué experiencias convierten a un viajero en promotor?",
      "¿Qué genera visitantes recurrentes?",
    ],
    known_influencers: ["live_recap", "travel_passport", "post_trip_loop"],
    entry_signal: "advocacy.signal.captured",
  },
};

/** Deriva la transición correspondiente a un salto de etapas (si es canónica). */
export function findTransition(from: VisitorStage, to: VisitorStage): JourneyTransition | null {
  for (const t of Object.values(JOURNEY_TRANSITIONS)) {
    if (t.from === from && t.to === to) return t;
  }
  return null;
}

/**
 * Niveles de confianza (Progressive Trust N0..N4) — usado para segregar
 * agregaciones (anónimo vs identificado vs cliente). Reutiliza contratos
 * existentes; no inventa uno paralelo.
 */
export type TrustLevel = "N0_anonymous" | "N1_continuity" | "N2_personalization" | "N3_operational" | "N4_transactional";
