/**
 * CV8.2 · Journey State Projection — Pure derivation v1.0.0.
 *
 * Cumple:
 *  - Founder Journey State Principle (proyección derivada, no persistida).
 *  - Regla de Proyección (explica eventos, transición, timestamp, confianza).
 *  - Regla de Recomputación (función pura, sin I/O, determinística).
 *
 * Consume EXCLUSIVAMENTE contratos v1.0.0 de CV8.0. Prohibido inferir
 * transiciones fuera de las canónicas T1..T9.
 */
import type { VisitorEvent } from "./events";
import {
  JOURNEY_TRANSITIONS,
  stageIndex,
  VISITOR_STAGES,
  type JourneyTransitionId,
  type VisitorStage,
} from "./journey";

export const JOURNEY_STATE_CONTRACT_VERSION = "1.0.0" as const;

export interface ProjectedTransition {
  transition_id: JourneyTransitionId;
  from: VisitorStage;
  to: VisitorStage;
  at: string;
  event_id: string;
}

export interface ProjectedVisitorState {
  subject_id: string;
  current_stage: VisitorStage;
  /** Evidencia acumulada de la etapa actual (0..1, saturado). */
  confidence: number;
  entered_current_stage_at: string;
  last_transition: ProjectedTransition | null;
  /** Últimos eventos que sustentan la etapa (Regla de Proyección). */
  justifying_event_ids: string[];
  /** Historial canónico de transiciones observadas (append-only, orden ascendente). */
  history: ProjectedTransition[];
  computed_at: string;
  contract_version: typeof JOURNEY_STATE_CONTRACT_VERSION;
}

function isKnownStage(s: string): s is VisitorStage {
  return (VISITOR_STAGES as readonly string[]).includes(s);
}

/**
 * Deriva el estado del Journey a partir de un historial de eventos.
 *
 * Reglas (ver Blueprint CV8.2 §3):
 *  1. Sin eventos → stranger, confidence 0.
 *  2. Sólo `journey.transition` canónica avanza etapa. Avance monotónico:
 *     se toma la de MAYOR `stageIndex(to)`; nunca retrocede.
 *  3. `intent.signal` y `decision.offered` acumulan confianza (no avanzan).
 *  4. `outcome.observed` con traveler_value ≥ 0.7 refuerza confianza.
 *  5. Confianza saturada en 1.0.
 */
export function projectVisitorState(
  subjectId: string,
  events: readonly VisitorEvent[],
  now: Date = new Date(),
): ProjectedVisitorState {
  const sorted = [...events]
    .filter((e) => e.subject.subject_id === subjectId)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  let currentStage: VisitorStage = "stranger";
  let enteredAt = sorted[0]?.occurred_at ?? now.toISOString();
  let lastTransition: ProjectedTransition | null = null;
  const history: ProjectedTransition[] = [];
  const justifying: string[] = [];
  let confidence = 0;

  for (const evt of sorted) {
    if (evt.kind === "journey.transition") {
      const canonical = JOURNEY_TRANSITIONS[evt.transition.id as JourneyTransitionId];
      if (!canonical) continue;
      if (!isKnownStage(evt.transition.to)) continue;
      const nextIdx = stageIndex(canonical.to);
      // Monotónico — nunca retrocede.
      if (nextIdx <= stageIndex(currentStage)) continue;

      currentStage = canonical.to;
      enteredAt = evt.occurred_at;
      const t: ProjectedTransition = {
        transition_id: canonical.id,
        from: canonical.from,
        to: canonical.to,
        at: evt.occurred_at,
        event_id: evt.event_id,
      };
      lastTransition = t;
      history.push(t);
      // Reinicia confianza para la nueva etapa; el propio evento la sustenta.
      confidence = Math.min(1, 0.5);
      justifying.length = 0;
      justifying.push(evt.event_id);
      continue;
    }

    if (evt.kind === "intent.signal") {
      confidence = Math.min(1, confidence + (evt.intent.strength ?? 0.1) * 0.2);
      justifying.push(evt.event_id);
    } else if (evt.kind === "decision.offered") {
      if (evt.decision.accepted === true) {
        confidence = Math.min(1, confidence + 0.15);
        justifying.push(evt.event_id);
      }
    } else if (evt.kind === "outcome.observed") {
      const v = evt.outcome.traveler_value ?? 0;
      if (v >= 0.7) {
        confidence = Math.min(1, confidence + 0.1);
        justifying.push(evt.event_id);
      }
    }
  }

  // Mantener sólo los últimos 5 eventos justificantes (Regla de Proyección).
  const tail = justifying.slice(-5);

  return {
    subject_id: subjectId,
    current_stage: currentStage,
    confidence: Number(confidence.toFixed(4)),
    entered_current_stage_at: enteredAt,
    last_transition: lastTransition,
    justifying_event_ids: tail,
    history,
    computed_at: now.toISOString(),
    contract_version: JOURNEY_STATE_CONTRACT_VERSION,
  };
}