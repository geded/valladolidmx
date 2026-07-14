/**
 * CV8.S.3 · Sub-motor Alux (Capa 2: Generación).
 *
 * Emite interacciones de Alux causalmente conectadas al Journey:
 *  - pregunta del viajero (intent.signal)
 *  - recomendación de Alux (decision.offered · accepted null)
 *  - aceptación o rechazo (decision.offered · accepted true/false)
 *  - optimización de itinerario (decision.offered · capability=alux.itinerary)
 *  - consultas onsite (intent.signal · surface live_day)
 *
 * Founder Ecosystem Interaction Principle:
 *  - Prerequisito real del Journey (from_transition).
 *  - Rationale legible en cada recomendación.
 *  - Devuelve `probability_modifier` que influye en la transición siguiente.
 */
import { destinationRoute } from "../paths";
import { sampleGap, MINUTE_MS } from "../calendar";
import type { SimulatedEvent } from "../behavior";
import type { AluxOutcome, SubMotorContext } from "./types";

function makeEvent(
  ctx: SubMotorContext,
  kind: "intent.signal" | "decision.offered",
  atMs: number,
  extra: Record<string, unknown>,
  causality: SimulatedEvent["causality"],
): SimulatedEvent {
  const base = {
    event_id: ctx.prng.uuid(),
    occurred_at: new Date(atMs).toISOString(),
    schema_version: "1.0.0" as const,
    subject: {
      subject_id: ctx.subject_id,
      trust_level: ctx.trust_level,
      is_authenticated: ctx.is_authenticated,
      locale: ctx.locale,
    },
    context: {
      destination_id: null,
      surface: `alux:${ctx.destination}`,
      route: destinationRoute(ctx.destination),
    },
  };
  return {
    event: { ...base, kind, ...extra } as SimulatedEvent["event"],
    is_simulation: true,
    simulation_run_id: ctx.runId,
    causality,
  };
}

/**
 * Emite interacciones Alux para una etapa del Journey.
 * `stage` selecciona el catálogo de acciones típicas:
 *  - "explorer"       (post-T3): preguntas sobre destinos.
 *  - "interested"     (post-T4): recomendaciones concretas + aceptación.
 *  - "travel_plan"    (post-T5): optimización de itinerario.
 *  - "onsite"         (post-T8): consultas contextuales onsite.
 */
export function emitAluxInteractions(
  ctx: SubMotorContext,
  stage: "explorer" | "interested" | "travel_plan" | "onsite",
): AluxOutcome {
  const { prng, profile } = ctx;
  const events: SimulatedEvent[] = [];
  let cursor = ctx.cursor_ms;
  const interactions = {
    asks: 0, recommendations: 0, accepted: 0, rejected: 0,
    itinerary_optimizations: 0, onsite_queries: 0,
  };
  let lastAccepted: string | null = null;

  // Probabilidad de interactuar con Alux por etapa/perfil.
  const interactRate =
    stage === "onsite"
      ? 0.3 + 0.5 * profile.propensities.concierge_acceptance
      : 0.4 + 0.4 * profile.propensities.exploration_depth;

  if (!prng.bool(interactRate)) {
    return {
      events, cursor_ms: cursor, last_accepted_recommendation_id: null,
      interactions, probability_modifier: 1,
    };
  }

  // 1. Pregunta del viajero — prerequisito para toda recomendación.
  cursor += sampleGap(prng, 20_000, 5 * MINUTE_MS);
  const askAction =
    stage === "onsite" ? "alux.onsite_query" : `alux.ask.${stage}`;
  events.push(
    makeEvent(ctx, "intent.signal", cursor, {
      intent: {
        action: askAction,
        target_type: "destination",
        target_id: ctx.destination,
        strength: 0.5 + prng.next() * 0.4,
      },
    }, {
      prerequisite: ctx.from_transition,
      influencer: "alux",
      gap_ms: 0,
      scenario_probability: interactRate,
    }),
  );
  if (stage === "onsite") interactions.onsite_queries += 1;
  else interactions.asks += 1;

  // 2. Recomendación (1..3) — cada una explicable, con aceptación/rechazo.
  const recCount = prng.int(1, stage === "travel_plan" ? 3 : 2);
  const acceptBase = 0.35 + 0.5 * profile.propensities.concierge_acceptance;

  for (let i = 0; i < recCount; i += 1) {
    cursor += sampleGap(prng, 5_000, 45_000);
    const recommendationId = `rec_${ctx.prng.uuid().slice(0, 12)}`;
    const capability =
      stage === "travel_plan" ? "alux.itinerary" : "alux";
    const rationale =
      stage === "travel_plan"
        ? `Optimización de itinerario en ${ctx.destination} para perfil ${profile.id}`
        : `Recomendación contextual para ${profile.id} en ${ctx.destination}`;

    // Recomendación emitida (accepted=null).
    events.push(
      makeEvent(ctx, "decision.offered", cursor, {
        decision: {
          capability,
          recommendation_id: recommendationId,
          rationale,
          accepted: null,
        },
      }, {
        prerequisite: askAction,
        influencer: capability,
        gap_ms: 0,
        scenario_probability: interactRate,
      }),
    );
    if (stage === "travel_plan") interactions.itinerary_optimizations += 1;
    interactions.recommendations += 1;

    // Resolución — aceptación o rechazo (nunca sin recomendación previa).
    cursor += sampleGap(prng, 3_000, 60_000);
    const accepted = prng.bool(acceptBase);
    events.push(
      makeEvent(ctx, "decision.offered", cursor, {
        decision: {
          capability,
          recommendation_id: recommendationId,
          rationale: accepted
            ? "Aceptada por el viajero"
            : "Rechazada por el viajero",
          accepted,
        },
      }, {
        prerequisite: recommendationId,
        influencer: capability,
        gap_ms: 0,
        scenario_probability: acceptBase,
      }),
    );
    if (accepted) {
      interactions.accepted += 1;
      lastAccepted = recommendationId;
    } else {
      interactions.rejected += 1;
    }
  }

  // Modificador de probabilidad para la siguiente transición del Journey.
  const acceptedRatio =
    interactions.recommendations > 0
      ? interactions.accepted / interactions.recommendations
      : 0;
  const probability_modifier = 0.9 + 0.35 * acceptedRatio;

  return {
    events,
    cursor_ms: cursor,
    last_accepted_recommendation_id: lastAccepted,
    interactions,
    probability_modifier,
  };
}