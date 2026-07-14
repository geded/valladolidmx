/**
 * CV8.S.2 · Pruebas del Motor de Eventos.
 *
 * Valida:
 *  - Determinismo: misma seed + escenario ⇒ mismos eventos byte-a-byte.
 *  - Causalidad: toda transición declara prerequisite/influencer/gap/prob.
 *  - Monotonicidad temporal: eventos por sujeto ordenados en el tiempo.
 *  - Canonicidad: sólo T1..T9; recorrido en orden; sin saltos.
 *  - Territorial: distribución no uniforme; nodo base concentra visitantes.
 *  - Aislamiento: todos los eventos con envelope simulación + subject_id `sim_*`.
 */
import { runScenario } from "@/lib/visitor-intel/simulation/engine";
import { CANONICAL_ORDER } from "@/lib/visitor-intel/simulation/causality";
import type { SimulationScenario } from "@/lib/visitor-intel/simulation/scenario";

const SEED = "test::cv8.s.2::v1";
const RUN_ID = "00000000-0000-4000-8000-00000000cafe";

const scenario: SimulationScenario = {
  schema_version: "1.0.0",
  scenario_id: "test-oriente-maya",
  scenario_version: "1.0.0",
  description: "Escenario de prueba CV8.S.2",
  scale: "light",
  seed: SEED,
  calendar: {
    start_date: "2026-03-01T00:00:00.000Z",
    end_date: "2026-05-30T00:00:00.000Z",
    weekend_boost: 1.6,
    season_boost: { "03": 1.3, "04": 1.2 },
    rainy_day_probability: 0.12,
  },
  destinations: {
    primary_destination: "valladolid",
    weights: {
      valladolid: 10, "chichen-itza": 5, "ek-balam": 2.5, izamal: 1.6,
      "rio-lagartos": 1.4, "las-coloradas": 1.4, espita: 0.8,
    },
  },
  profile_mix: [
    { profile: "couple_international", weight: 3, propensities: {
      exploration_depth: 0.75, favorite_to_plan: 0.55, concierge_acceptance: 0.6,
      purchase_intent: 0.65, weather_sensitivity: 0.55, language_diversity: 0.8,
      ticket_size_usd: [180, 420] } },
    { profile: "family", weight: 3, propensities: {
      exploration_depth: 0.55, favorite_to_plan: 0.6, concierge_acceptance: 0.55,
      purchase_intent: 0.6, weather_sensitivity: 0.7, language_diversity: 0.3,
      ticket_size_usd: [140, 380] } },
    { profile: "backpacker", weight: 2, propensities: {
      exploration_depth: 0.85, favorite_to_plan: 0.35, concierge_acceptance: 0.2,
      purchase_intent: 0.3, weather_sensitivity: 0.25, language_diversity: 0.9,
      ticket_size_usd: [30, 90] } },
  ],
  planted_issues: {
    early_abandonment_rate: 0.08, low_conversion_categories: [],
    wrong_language_rate: 0.03, slow_business_response_rate: 0.05,
    late_proposals_rate: 0.04, underexplored_destinations: [],
  },
  locales: ["es", "en"],
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function digest(events: unknown[]): string {
  // Hash simple determinístico (FNV-1a) sobre la serialización estable.
  const s = JSON.stringify(events);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function main() {
  // 1. Determinismo.
  const runA = runScenario({ scenario, runId: RUN_ID });
  const runB = runScenario({ scenario, runId: RUN_ID });
  const digestA = digest(runA.events.map((e) => e.event));
  const digestB = digest(runB.events.map((e) => e.event));
  assert(digestA === digestB, `determinismo — digestA=${digestA} digestB=${digestB}`);

  const events = runA.events;
  assert(events.length > 0, "escenario produjo cero eventos");

  // 2. Aislamiento — envelope siempre presente.
  for (const e of events) {
    assert(e.is_simulation === true, "evento sin is_simulation=true");
    assert(e.simulation_run_id === RUN_ID, "evento con run_id incorrecto");
    assert(e.event.subject.subject_id.startsWith("sim_"), "subject_id sin prefijo sim_");
  }

  // 3. Causalidad — todo journey.transition trae metadatos completos.
  const canonical = new Set<string>(CANONICAL_ORDER);
  for (const e of events) {
    if (e.event.kind !== "journey.transition") continue;
    assert(canonical.has(e.event.transition.id), `transición no canónica ${e.event.transition.id}`);
    assert(!!e.causality.prerequisite, "causalidad sin prerequisite");
    assert(!!e.causality.influencer, "causalidad sin influencer");
    assert(e.causality.scenario_probability >= 0 && e.causality.scenario_probability <= 1,
      "scenario_probability fuera de rango");
    assert(e.causality.gap_ms >= 0, "gap_ms negativo");
  }

  // 4. Monotonicidad + orden canónico por sujeto (sin saltos).
  const bySubject = new Map<string, typeof events>();
  for (const e of events) {
    const arr = bySubject.get(e.event.subject.subject_id) ?? [];
    arr.push(e);
    bySubject.set(e.event.subject.subject_id, arr);
  }
  for (const [sid, list] of bySubject.entries()) {
    let prevMs = 0;
    const transitions = list.filter((e) => e.event.kind === "journey.transition");
    for (let i = 0; i < transitions.length; i += 1) {
      const t = transitions[i]!;
      const canonicalIdx = CANONICAL_ORDER.indexOf(
        (t.event as { transition: { id: string } }).transition.id as (typeof CANONICAL_ORDER)[number],
      );
      assert(canonicalIdx === i, `sujeto ${sid} salta transición en posición ${i}`);
    }
    for (const e of list) {
      const ms = new Date(e.event.occurred_at).getTime();
      assert(ms >= prevMs, `sujeto ${sid} eventos no monotónicos`);
      prevMs = ms;
    }
  }

  // 5. Territorial — Valladolid es nodo base de todos los visitantes
  //    (concentración medida por visitantes únicos, no touches).
  const uniqueByDest = new Map<string, Set<string>>();
  for (const t of runA.traces) {
    for (const d of t.path) {
      const s = uniqueByDest.get(d) ?? new Set<string>();
      s.add(t.subject_id);
      uniqueByDest.set(d, s);
    }
  }
  const vallUnique = uniqueByDest.get("valladolid")?.size ?? 0;
  assert(vallUnique === runA.stats.visitors, `Valladolid no es nodo base de todos (${vallUnique}/${runA.stats.visitors})`);
  for (const [k, s] of uniqueByDest.entries()) {
    if (k === "valladolid") continue;
    assert(s.size < vallUnique, `${k} (${s.size}) supera a Valladolid (${vallUnique})`);
  }
  // Distribución no uniforme: coeficiente de variación > 0.15 sobre touches.
  const values = Object.values(runA.stats.territorial_touches);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  assert(cv > 0.15, `distribución territorial demasiado uniforme (cv=${cv.toFixed(3)})`);

  // 6. Volumen mínimo — recorridos completos y parciales presentes.
  const finals = runA.stats.final_stage_histogram;
  const distinctFinals = Object.keys(finals).length;
  assert(distinctFinals >= 3, `poca variedad de finales (${distinctFinals})`);

  console.log(JSON.stringify({
    ok: true,
    visitors: runA.stats.visitors,
    events_total: runA.stats.events_total,
    events_by_transition: runA.stats.events_by_transition,
    final_stage_histogram: finals,
    territorial_touches: runA.stats.territorial_touches,
    digest: digestA,
  }, null, 2));
}

main();