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

    // Regresos posteriores (multi-sesión): 40% de gap → +días.
    if (ti >= 3 && prng.bool(0.4)) {
      cursorMs += prng.int(1, 3) * DAY_MS;
    }
  }

  return { subject_id, profile: profile.id, locale, path, final_stage: finalStage, events };
}