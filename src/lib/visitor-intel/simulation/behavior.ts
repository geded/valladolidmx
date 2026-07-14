/**
 * CV8.S.2 · Motor de comportamiento por visitante (Capa 2: Generación).
 *
 * Convierte perfil + calendario + territorio + causalidad en una secuencia
 * coherente de `VisitorEvent` con envelope de aislamiento
 * (`is_simulation=true`, `simulation_run_id`) y metadatos de causalidad
 * (Founder Scenario Coherence Principle).
 *
 * Puro — no persiste. Sub-ola CV8.S.4 se encarga del insert bulk.
 */
import type { VisitorEvent } from "../events";
import { JOURNEY_TRANSITIONS, type JourneyTransitionId, type TrustLevel } from "../journey";
import { CAUSALITY_RULES, CANONICAL_ORDER } from "./causality";
import { DAY_MS, sampleGap, type SessionMoment } from "./calendar";
import { pickTerritorialPath, destinationRoute, type DestinationSlug } from "./paths";
import type { ProfileDefinition } from "./profiles";
import type { Prng } from "./prng";
import { simulatedSubjectId } from "./scenario";
import type { SimulationScenario } from "./scenario";
import {
  emitAluxInteractions,
  emitConciergeCase,
  emitCommerceOrder,
  emitReviewLoop,
  type SubMotorContext,
  type AluxOutcome,
  type ConciergeOutcome,
  type CommerceOutcome,
  type ReviewsOutcome,
} from "./sub-motors";

export interface CausalityMeta {
  prerequisite: string;
  influencer: string;
  gap_ms: number;
  scenario_probability: number;
}

export interface SimulatedEvent {
  event: VisitorEvent;
  is_simulation: true;
  simulation_run_id: string;
  causality: CausalityMeta;
}

export interface VisitorTrace {
  subject_id: string;
  profile: ProfileDefinition["id"];
  locale: string;
  path: DestinationSlug[];
  final_stage: string;
  events: SimulatedEvent[];
  /** Matriz Perfil→Alux→Concierge→Commerce→Reviews→Outcome (CV8.S.3). */
  interactions: {
    alux: AluxOutcome["interactions"];
    concierge: {
      opened: boolean;
      status: ConciergeOutcome["status"] | "none";
      slow_response: boolean;
    };
    commerce: {
      status: CommerceOutcome["status"];
      amount_usd: number | null;
    };
    reviews: {
      published: boolean;
      rating: number | null;
      business_responded: boolean;
    };
  };
}

function trustFor(stageIndex: number, transitionId: JourneyTransitionId): TrustLevel {
  // Progressive Trust — mapping conservador basado en transiciones canónicas.
  if (transitionId === "T1_stranger_to_anonymous") return "N0_anonymous";
  if (transitionId === "T2_anonymous_to_identified") return "N1_continuity";
  if (stageIndex <= 4) return "N1_continuity";
  if (stageIndex === 5) return "N2_personalization";
  if (stageIndex === 6) return "N3_operational";
  return "N4_transactional";
}

function surfaceFor(transitionId: JourneyTransitionId, dest: DestinationSlug): string {
  switch (transitionId) {
    case "T1_stranger_to_anonymous": return "landing";
    case "T2_anonymous_to_identified": return "auth";
    case "T3_identified_to_explorer": return `discovery:${dest}`;
    case "T4_explorer_to_interested": return `listing:${dest}`;
    case "T5_interested_to_travel_plan": return "workspace:trip";
    case "T6_travel_plan_to_concierge": return "workspace:concierge";
    case "T7_concierge_to_reservation": return "checkout";
    case "T8_reservation_to_traveler": return `live_day:${dest}`;
    case "T9_traveler_to_ambassador": return "post_trip";
  }
}

/**
 * Simula el Journey completo (posiblemente parcial por abandono) de un visitante.
 *
 * Reglas aplicadas:
 *  - Regla de Causalidad: cada evento declara prerequisito, influencer, gap_ms, scenario_probability.
 *  - Regla Territorial: el `route` de cada evento se vincula a un destino del path muestreado.
 *  - Regla de Realismo Temporal: gaps muestreados dentro de ventanas por transición.
 *  - Cero saltos: se recorre CANONICAL_ORDER en orden.
 */
export function simulateVisitor(params: {
  runId: string;
  index: number;
  profile: ProfileDefinition;
  session: SessionMoment;
  scenario: SimulationScenario;
  prng: Prng;
}): VisitorTrace {
  const { runId, index, profile, session, scenario, prng } = params;
  const subject_id = simulatedSubjectId(runId, index);
  const primary = scenario.destinations.primary_destination as DestinationSlug;
  const tripDays = prng.int(profile.trip_length_days[0], profile.trip_length_days[1]);
  const path = pickTerritorialPath(primary, tripDays, profile.id, prng);
  const locale = prng.weighted(profile.locales.map(([l, w]) => [l, w] as const));

  const events: SimulatedEvent[] = [];
  let cursorMs = session.ms;
  let finalStage = "stranger";

  // Acumuladores de sub-motores (CV8.S.3).
  let aluxTotals: AluxOutcome["interactions"] = {
    asks: 0, recommendations: 0, accepted: 0, rejected: 0,
    itinerary_optimizations: 0, onsite_queries: 0,
  };
  let conciergeSummary: VisitorTrace["interactions"]["concierge"] = {
    opened: false, status: "none", slow_response: false,
  };
  let commerceSummary: VisitorTrace["interactions"]["commerce"] = {
    status: "not_created", amount_usd: null,
  };
  let reviewsSummary: VisitorTrace["interactions"]["reviews"] = {
    published: false, rating: null, business_responded: false,
  };
  /** Estado inter-sub-motor: última propuesta aceptada (Concierge). */
  let conciergeOutcome: ConciergeOutcome | null = null;
  /** Ajuste probabilístico acumulado (Alux). */
  let nextTransitionModifier = 1;
  /** Ajuste multiplicativo para T9 (Reviews). */
  let ambassadorModifier = 1;

  for (let ti = 0; ti < CANONICAL_ORDER.length; ti += 1) {
    const transitionId = CANONICAL_ORDER[ti]!;
    const rule = CAUSALITY_RULES[transitionId];
    const transition = JOURNEY_TRANSITIONS[transitionId];

    // Probabilidad efectiva — modulada por planted issues + contexto.
    let prob = rule.base_probability(profile.propensities);
    if (ti === 0) prob = 1;
    // Weather sensitivity aplica en transiciones onsite.
    if (session.is_rainy && (ti === 7 || ti === 3)) {
      prob *= 1 - profile.propensities.weather_sensitivity * 0.4;
    }
    // Early abandonment planted issue en T2/T3.
    if (ti === 1 || ti === 2) {
      prob *= 1 - scenario.planted_issues.early_abandonment_rate;
    }
    // Late proposals penaliza T6→T7.
    if (ti === 6) prob *= 1 - scenario.planted_issues.late_proposals_rate;

    // CV8.S.3 · Modificadores por sub-motor.
    prob *= nextTransitionModifier;
    nextTransitionModifier = 1; // consume el boost una sola vez
    // T7 requiere propuesta aceptada Y pago exitoso (regla de cohesión).
    if (ti === 6) {
      if (conciergeOutcome?.status !== "proposal_accepted") {
        // sin Concierge exitoso no puede avanzar a reservation
        prob *= 0.05;
      }
    }
    if (ti === 8) prob *= ambassadorModifier;

    prob = Math.max(0, Math.min(1, prob));
    const roll = prng.next();
    if (roll > prob) break; // abandono en esta etapa

    const gap = sampleGap(prng, rule.min_gap_ms, rule.max_gap_ms);
    cursorMs += gap;
    const dest = path[Math.min(ti, path.length - 1)]!;
    const trust = trustFor(ti + 1, transitionId);
    const isAuth = ti >= 1; // desde T2 en adelante autenticado

    const event: VisitorEvent = {
      event_id: prng.uuid(),
      occurred_at: new Date(cursorMs).toISOString(),
      schema_version: "1.0.0",
      kind: "journey.transition",
      subject: {
        subject_id,
        trust_level: trust,
        is_authenticated: isAuth,
        locale,
      },
      context: {
        destination_id: null,
        surface: surfaceFor(transitionId, dest),
        route: destinationRoute(dest),
      },
      transition: {
        id: transitionId,
        from: transition.from,
        to: transition.to,
        attributed_action: rule.prerequisite,
        influencing_capabilities: [rule.influencer],
      },
    };

    events.push({
      event: event,
      is_simulation: true,
      simulation_run_id: runId,
      causality: {
        prerequisite: rule.prerequisite,
        influencer: rule.influencer,
        gap_ms: gap,
        scenario_probability: prob,
      },
    });
    finalStage = transition.to;

    // Después de T4 (interested), añadir intent.signal coherente.
    if (ti === 3 && prng.bool(0.85)) {
      cursorMs += sampleGap(prng, 5_000, 90_000);
      events.push({
        event: {
          event_id: prng.uuid(),
          occurred_at: new Date(cursorMs).toISOString(),
          schema_version: "1.0.0",
          kind: "intent.signal",
          subject: { subject_id, trust_level: trust, is_authenticated: isAuth, locale },
          context: {
            destination_id: null,
            surface: `listing:${dest}`,
            route: destinationRoute(dest),
          },
          intent: {
            action: "favorite",
            target_type: "business",
            strength: 0.5 + prng.next() * 0.4,
          },
        },
        is_simulation: true,
        simulation_run_id: runId,
        causality: {
          prerequisite: "explorer_engagement",
          influencer: "favorite",
          gap_ms: 0,
          scenario_probability: prob,
        },
      });
    }

    // ==========================================================
    // CV8.S.3 · Hooks causales de sub-motores por transición.
    // ==========================================================
    const subCtx: SubMotorContext = {
      runId, subject_id, locale, profile,
      destination: dest, scenario, prng,
      cursor_ms: cursorMs,
      from_transition: transitionId,
      trust_level: trust,
      is_authenticated: isAuth,
    };

    // Alux post-T3 (explorer): preguntas exploratorias.
    if (ti === 2) {
      const a = emitAluxInteractions(subCtx, "explorer");
      events.push(...a.events);
      cursorMs = a.cursor_ms;
      aluxTotals = mergeAluxTotals(aluxTotals, a.interactions);
      nextTransitionModifier *= a.probability_modifier;
    }
    // Alux post-T4 (interested): recomendaciones + aceptaciones.
    if (ti === 3) {
      const a = emitAluxInteractions({ ...subCtx, cursor_ms: cursorMs }, "interested");
      events.push(...a.events);
      cursorMs = a.cursor_ms;
      aluxTotals = mergeAluxTotals(aluxTotals, a.interactions);
      nextTransitionModifier *= a.probability_modifier;
    }
    // Alux post-T5 (travel_plan): optimización de itinerario.
    if (ti === 4) {
      const a = emitAluxInteractions({ ...subCtx, cursor_ms: cursorMs }, "travel_plan");
      events.push(...a.events);
      cursorMs = a.cursor_ms;
      aluxTotals = mergeAluxTotals(aluxTotals, a.interactions);
      nextTransitionModifier *= a.probability_modifier;
    }
    // Concierge post-T6 (case abierto).
    if (ti === 5) {
      const c = emitConciergeCase({ ...subCtx, cursor_ms: cursorMs });
      events.push(...c.events);
      cursorMs = c.cursor_ms;
      conciergeOutcome = c;
      conciergeSummary = {
        opened: true, status: c.status, slow_response: c.slow_response,
      };
    }
    // Commerce post-T7 (sólo si propuesta aceptada).
    if (ti === 6 && conciergeOutcome) {
      const co = emitCommerceOrder({ ...subCtx, cursor_ms: cursorMs }, conciergeOutcome);
      events.push(...co.events);
      cursorMs = co.cursor_ms;
      commerceSummary = { status: co.status, amount_usd: co.amount_usd };
      // Sin pago exitoso, la reservation no se materializa realmente:
      // el evento T7 ya fue emitido, pero prevenimos T8 si no hubo pago.
      if (co.status !== "paid" && co.status !== "refunded") {
        nextTransitionModifier *= 0.05;
      }
    }
    // Alux onsite + Reviews post-T8.
    if (ti === 7) {
      const a = emitAluxInteractions({ ...subCtx, cursor_ms: cursorMs }, "onsite");
      events.push(...a.events);
      cursorMs = a.cursor_ms;
      aluxTotals = mergeAluxTotals(aluxTotals, a.interactions);
      const r = emitReviewLoop({ ...subCtx, cursor_ms: cursorMs });
      events.push(...r.events);
      cursorMs = r.cursor_ms;
      reviewsSummary = {
        published: r.review_published,
        rating: r.rating,
        business_responded: r.business_responded,
      };
      ambassadorModifier = r.ambassador_modifier;
    }

    // Regresos posteriores (multi-sesión): 40% de gap → +días.
    if (ti >= 3 && prng.bool(0.4)) {
      cursorMs += prng.int(1, 3) * DAY_MS;
    }
  }

  return {
    subject_id, profile: profile.id, locale, path, final_stage: finalStage, events,
    interactions: {
      alux: aluxTotals,
      concierge: conciergeSummary,
      commerce: commerceSummary,
      reviews: reviewsSummary,
    },
  };
}

function mergeAluxTotals(
  a: AluxOutcome["interactions"],
  b: AluxOutcome["interactions"],
): AluxOutcome["interactions"] {
  return {
    asks: a.asks + b.asks,
    recommendations: a.recommendations + b.recommendations,
    accepted: a.accepted + b.accepted,
    rejected: a.rejected + b.rejected,
    itinerary_optimizations: a.itinerary_optimizations + b.itinerary_optimizations,
    onsite_queries: a.onsite_queries + b.onsite_queries,
  };
}