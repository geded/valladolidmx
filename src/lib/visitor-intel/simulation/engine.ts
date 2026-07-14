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
    },
  };
}