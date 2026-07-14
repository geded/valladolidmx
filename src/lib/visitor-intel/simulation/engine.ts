/**
 * CV8.S.2 · Orquestador del escenario (Capa 3: Ejecución).
 *
 * runScenario() consume un `SimulationScenario` + PRNG y devuelve todos los
 * visitantes simulados con sus eventos. NO persiste. Sub-ola CV8.S.4 se
 * encarga del bulk insert + creación de `simulation_runs`.
 *
 * Determinístico: misma seed + mismo escenario ⇒ mismos eventos byte-a-byte.
 */
import type { JourneyTransitionId } from "../journey";
import { PROFILE_CATALOG } from "./profiles";
import { sampleSessionMoment } from "./calendar";
import { createPrng } from "./prng";
import { simulateVisitor, type VisitorTrace, type SimulatedEvent } from "./behavior";
import {
  SCALE_VISITORS,
  SimulationScenarioSchema,
  type SimulationScenario,
} from "./scenario";

export interface RunScenarioResult {
  run_id_placeholder: string; // real UUID lo crea S.4 al persistir
  scenario_id: string;
  seed: string;
  scale: SimulationScenario["scale"];
  traces: VisitorTrace[];
  events: SimulatedEvent[];
  stats: {
    visitors: number;
    events_total: number;
    events_by_transition: Record<string, number>;
    events_by_kind: Record<string, number>;
    final_stage_histogram: Record<string, number>;
    territorial_touches: Record<string, number>;
    // CV8.S.3 · Sub-motores.
    alux_totals: {
      asks: number; recommendations: number; accepted: number; rejected: number;
      itinerary_optimizations: number; onsite_queries: number;
    };
    concierge_status_histogram: Record<string, number>;
    commerce_status_histogram: Record<string, number>;
    commerce_revenue_usd: number;
    reviews_summary: {
      requested: number; published: number; business_responded: number;
      average_rating: number | null;
    };
  };
}

/**
 * Ejecuta el escenario en memoria. Reciibe un `runId` (el catálogo lo
 * genera S.4 antes de correr) para envelopar cada evento con el ID
 * definitivo desde el inicio.
 */
export function runScenario(params: {
  scenario: SimulationScenario;
  runId: string;
}): RunScenarioResult {
  const scenario = SimulationScenarioSchema.parse(params.scenario);
  const prng = createPrng(scenario.seed);
  const visitorsCount = SCALE_VISITORS[scenario.scale];

  const traces: VisitorTrace[] = [];
  const events: SimulatedEvent[] = [];
  const events_by_transition: Record<string, number> = {};
  const events_by_kind: Record<string, number> = {};
  const final_stage_histogram: Record<string, number> = {};
  const territorial_touches: Record<string, number> = {};
  const alux_totals = {
    asks: 0, recommendations: 0, accepted: 0, rejected: 0,
    itinerary_optimizations: 0, onsite_queries: 0,
  };
  const concierge_status_histogram: Record<string, number> = {};
  const commerce_status_histogram: Record<string, number> = {};
  let commerce_revenue_usd = 0;
  let reviews_requested = 0;
  let reviews_published = 0;
  let reviews_business_responded = 0;
  let ratings_sum = 0;
  let ratings_count = 0;

  // Muestreamos la mezcla de perfiles como pesos.
  const profileEntries: Array<readonly [string, number]> = scenario.profile_mix.map(
    (p) => [p.profile, p.weight] as const,
  );

  for (let i = 0; i < visitorsCount; i += 1) {
    const profileId = prng.weighted(profileEntries) as keyof typeof PROFILE_CATALOG;
    const profile = PROFILE_CATALOG[profileId];
    const session = sampleSessionMoment(scenario.calendar, prng);
    const trace = simulateVisitor({
      runId: params.runId,
      index: i,
      profile,
      session,
      scenario,
      prng,
    });
    traces.push(trace);
    for (const ev of trace.events) {
      events.push(ev);
      const k = ev.event.kind;
      events_by_kind[k] = (events_by_kind[k] ?? 0) + 1;
      if (ev.event.kind === "journey.transition") {
        const t = ev.event.transition.id as JourneyTransitionId;
        events_by_transition[t] = (events_by_transition[t] ?? 0) + 1;
      }
    }
    final_stage_histogram[trace.final_stage] =
      (final_stage_histogram[trace.final_stage] ?? 0) + 1;
    for (const d of trace.path) {
      territorial_touches[d] = (territorial_touches[d] ?? 0) + 1;
    }

    // Agregados de sub-motores.
    const inx = trace.interactions;
    alux_totals.asks += inx.alux.asks;
    alux_totals.recommendations += inx.alux.recommendations;
    alux_totals.accepted += inx.alux.accepted;
    alux_totals.rejected += inx.alux.rejected;
    alux_totals.itinerary_optimizations += inx.alux.itinerary_optimizations;
    alux_totals.onsite_queries += inx.alux.onsite_queries;
    concierge_status_histogram[inx.concierge.status] =
      (concierge_status_histogram[inx.concierge.status] ?? 0) + 1;
    commerce_status_histogram[inx.commerce.status] =
      (commerce_status_histogram[inx.commerce.status] ?? 0) + 1;
    if (inx.commerce.amount_usd != null && inx.commerce.status === "paid") {
      commerce_revenue_usd += inx.commerce.amount_usd;
    }
    if (inx.concierge.opened) {
      // Solicitud de reseña sólo se emite si hubo T8 y sub-motor Reviews entró;
      // aquí contamos "publicaciones" y "requested" mediante el summary.
    }
    if (inx.reviews.published) reviews_published += 1;
    if (inx.reviews.business_responded) reviews_business_responded += 1;
    if (inx.reviews.rating != null) {
      ratings_sum += inx.reviews.rating;
      ratings_count += 1;
    }
    // Toda traza que alcanzó T8 recibió una solicitud de reseña.
    if (
      trace.final_stage === "traveler" ||
      trace.final_stage === "ambassador"
    ) {
      reviews_requested += 1;
    }
  }

  return {
    run_id_placeholder: params.runId,
    scenario_id: scenario.scenario_id,
    seed: scenario.seed,
    scale: scenario.scale,
    traces,
    events,
    stats: {
      visitors: traces.length,
      events_total: events.length,
      events_by_transition,
      events_by_kind,
      final_stage_histogram,
      territorial_touches,
      alux_totals,
      concierge_status_histogram,
      commerce_status_histogram,
      commerce_revenue_usd,
      reviews_summary: {
        requested: reviews_requested,
        published: reviews_published,
        business_responded: reviews_business_responded,
        average_rating: ratings_count > 0 ? ratings_sum / ratings_count : null,
      },
    },
  };
}