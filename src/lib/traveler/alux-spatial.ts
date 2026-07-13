/**
 * CV6.6 · Alux Espacial — Derivador puro de propuestas proactivas.
 *
 * Política vinculante: `mem://policies/founder-proactive-copilot.md`.
 *
 * Fuente única (guardrail):
 *   - `ResolvedDestinationContext` (CV6.4)
 *   - `DecisionCenter`             (CV6.2 / CV6.5)
 *   - `LiveDayContext`             (CV6.1)
 *   - Travel Plan Contract         (via LiveDay items)
 *
 * Prohibido: acceso directo a Weather / Hours / Traffic Contributors,
 * Google Maps, Open-Meteo, CMS o APIs externas.
 *
 * Reglas invariantes:
 *   1. Regla de Oportunidad — sólo se emite propuesta cuando existe una
 *      mejora concreta en la decisión del viajero. Nunca por el mero
 *      hecho de que llegue información nueva.
 *   2. Regla de No Saturación — máx. 1 propuesta por slot y tope global
 *      de 2. Dedupe por `dedupeKey` contra `seenKeys` (sesión).
 *   3. Auto-Hide — si Decision Center está vacío o no hay oportunidad,
 *      retorna `[]` y la superficie se oculta.
 *   4. Explainable by Default — cada propuesta declara `rationale`,
 *      `sources`, `expected_effect`, `reversible`, `confidence`.
 *   5. Learning Ready — contrato incluye `feedback?` opcional (no
 *      consumido en CV6.6).
 *   6. Alux no muta estado; sólo propone.
 */

import type { DecisionCard, DecisionCenter } from "@/lib/traveler/decision-center";
import type { LiveDayContext } from "@/lib/traveler/live-day";
import type { ResolvedDestinationContext } from "@/lib/traveler/destination-context";
import type { TripPhase } from "@/lib/traveler/trip-phase";

export type AluxConfidence = "low" | "medium" | "high";

export type AluxProposalIntent =
  | "navigate"
  | "open_plan_item"
  | "reorganize"
  | "view_alternative"
  | "open_map"
  | "custom";

export interface AluxProposalCta {
  label: string;
  intent: AluxProposalIntent;
  payload?: Record<string, unknown>;
}

/** Contrato canónico de propuesta proactiva de Alux Espacial. */
export interface AluxSpatialProposal {
  /** Clave estable — coincide con `dedupeKey` en CV6.6. */
  id: string;
  slot: "now" | "next" | "later";
  headline: string;
  /** Las 4 preguntas del Founder Proactive Copilot Principle. */
  whatToDo: string;
  whyItMatters: string;
  expectedBenefit: string;
  ifIgnored: string;
  primaryCta: AluxProposalCta;
  /** Explainable by Default. */
  rationale: string;
  sources: Array<
    "live_day" | "decision_center" | "destination_context" | "travel_plan"
  >;
  expected_effect: string;
  reversible: true;
  confidence: AluxConfidence;
  planItemId?: string | null;
  /** Dedupe por sesión — Regla de No Saturación. */
  dedupeKey: string;
  /**
   * Learning Ready — reservado. CV6.6 no consume ni persiste este campo;
   * futuras sub-olas podrán registrar feedback sin migrar contrato.
   */
  feedback?: {
    accepted?: boolean;
    rejected?: boolean;
    ignored?: boolean;
    postponed?: boolean;
  };
}

export interface DeriveAluxSpatialInput {
  phase: TripPhase;
  liveDay: LiveDayContext | null;
  decisionCenter: DecisionCenter;
  destinationContext?: ResolvedDestinationContext | null;
  at: Date;
  /** Claves ya propuestas en la sesión (dedupe). */
  seenKeys?: ReadonlySet<string>;
  /** Tope global (default 2 · Regla de No Saturación). */
  maxProposals?: number;
}

// ---------------------------------------------------------------------------
// Reglas de oportunidad
// ---------------------------------------------------------------------------

/**
 * Traduce una `DecisionCard` de Decision Center — ya priorizada y
 * validada por su Auto-Hide — en una propuesta Alux con las 4 preguntas.
 *
 * NOTA: consumimos exclusivamente el Decision Center (no las señales
 * crudas de los Contributors). Esto respeta el guardrail vinculante.
 */
function proposalFromDecision(
  card: DecisionCard,
  liveDay: LiveDayContext | null,
): AluxSpatialProposal | null {
  const planItemId = card.planItemId ?? null;
  const item =
    planItemId && liveDay
      ? liveDay.items.find((i) => i.id === planItemId) ?? null
      : null;

  // Deriva un CTA a partir del intent principal (o `open_plan_item` por
  // defecto — nunca inventamos acciones nuevas).
  const cta: AluxProposalCta = card.primaryAction
    ? {
        label: card.primaryAction.label,
        intent:
          (card.primaryAction.intent as AluxProposalIntent) ?? "open_plan_item",
        payload: card.primaryAction.payload,
      }
    : {
        label: "Ver en Mi Viaje",
        intent: "open_plan_item",
        payload: planItemId ? { planItemId } : undefined,
      };

  // Confianza derivada de la prioridad de Decision Center.
  const confidence: AluxConfidence =
    card.priority >= 80 ? "high" : card.priority >= 55 ? "medium" : "low";

  // Los 4 textos se derivan por familia de señal (id del contribuyente
  // origen). Todo texto vive aquí — nunca leemos textos de fuera.
  let headline = card.title;
  let whatToDo = card.primaryAction?.label ?? "Revisa esta oportunidad.";
  let whyItMatters = card.rationale;
  let expectedBenefit = "Mejora tu experiencia en el destino.";
  let ifIgnored = "Podrías perder una mejor opción en este momento.";

  if (card.id.startsWith("destination.traffic:leave-now")) {
    headline = "Sal ahora";
    whatToDo = "Inicia la navegación hacia tu próximo lugar.";
    expectedBenefit = "Llegas a tiempo, sin prisas ni presión.";
    ifIgnored = "Podrías llegar tarde y perder parte de la experiencia.";
  } else if (card.id.startsWith("destination.traffic:leave-soon")) {
    headline = card.title;
    whatToDo = "Prepárate para salir en los próximos minutos.";
    expectedBenefit = "Salida tranquila con margen suficiente.";
    ifIgnored = "Salir después implicaría tráfico y tiempo perdido.";
  } else if (card.id.startsWith("destination.traffic:likely-late")) {
    headline = "Reorganiza para no llegar tarde";
    whatToDo = "Ajusta el orden o avisa al lugar de tu llegada.";
    expectedBenefit = "Preservas la experiencia sin frustración.";
    ifIgnored = "Llegarías tarde y podrías perder acceso o reserva.";
  } else if (card.id.startsWith("destination.traffic:delay-risk")) {
    headline = "Riesgo de retraso — considera adelantar";
    whatToDo = "Adelanta la salida o reordena la actividad.";
    expectedBenefit = "Evitas presión de última hora.";
    ifIgnored = "El retraso podría afectar reservas posteriores.";
  } else if (card.id.startsWith("destination.weather")) {
    headline = "El clima puede cambiar tu plan";
    whatToDo = "Considera reorganizar para evitar la lluvia.";
    expectedBenefit = "Vives las actividades con mejor clima.";
    ifIgnored = "Podrías vivir el momento bajo lluvia intensa.";
  } else if (card.id.startsWith("destination.hours:closing")) {
    headline = "Cierra pronto — aprovecha ahora";
    whatToDo = "Completa tu visita antes del cierre.";
    expectedBenefit = "Aprovechas al máximo este atractivo.";
    ifIgnored = "Podrías quedarte fuera antes de terminar.";
  } else if (card.id.startsWith("destination.hours:opening")) {
    headline = "Abre en breve — llega justo a tiempo";
    whatToDo = "Sal para llegar al abrir y evitar filas.";
    expectedBenefit = "Aprovechas la primera ventana del día.";
    ifIgnored = "Podrías encontrar fila al llegar más tarde.";
  } else if (card.id.startsWith("destination.hours:closed")) {
    headline = "Cerrado — reordena tu día";
    whatToDo = "Elige un plan alternativo cercano.";
    expectedBenefit = "No pierdes tiempo yendo a un lugar cerrado.";
    ifIgnored = "El traslado sería infructuoso.";
  } else if (card.id.startsWith("next:")) {
    // Ítem inminente sin señales de destino — sólo lo elevamos si es
    // salida realmente próxima (Decision Center ya evaluó "soon").
    headline = card.title;
    whatToDo = card.primaryAction?.label ?? "Prepárate para tu próxima actividad.";
    expectedBenefit = "Empiezas a tiempo y sin correr.";
    ifIgnored = "Salir después implicaría retrasos evitables.";
  } else {
    // Regla de Oportunidad: si no hay familia reconocida con valor
    // proactivo claro, no emitimos propuesta.
    return null;
  }

  const dedupeKey = card.id; // estable por diseño en Decision Center.
  return {
    id: dedupeKey,
    slot: card.slot,
    headline,
    whatToDo,
    whyItMatters,
    expectedBenefit,
    ifIgnored,
    primaryCta: cta,
    rationale: card.rationale,
    sources: [
      "decision_center",
      ...(item ? (["live_day", "travel_plan"] as const) : []),
    ],
    expected_effect: expectedBenefit,
    reversible: true,
    confidence,
    planItemId,
    dedupeKey,
  };
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

/**
 * Deriva las propuestas proactivas de Alux Espacial.
 *
 * Auto-Hide global si:
 *  - `phase !== "onsite"`
 *  - `decisionCenter.empty === true`
 *  - ninguna tarjeta cumple la Regla de Oportunidad.
 */
export function deriveAluxSpatialProposals(
  input: DeriveAluxSpatialInput,
): AluxSpatialProposal[] {
  if (input.phase !== "onsite") return [];
  if (input.decisionCenter.empty) return [];

  const seen = input.seenKeys ?? new Set<string>();
  const cap = Math.max(1, input.maxProposals ?? 2);

  // Cardinal: priorizar warning/critical, luego prioridad numérica.
  const toneWeight = (t: DecisionCard["tone"]) =>
    t === "critical" ? 3 : t === "warning" ? 2 : t === "success" ? 1 : 0;

  const all: DecisionCard[] = [
    ...input.decisionCenter.now,
    ...input.decisionCenter.next,
    ...input.decisionCenter.later,
  ].sort((a, b) => {
    const w = toneWeight(b.tone) - toneWeight(a.tone);
    if (w !== 0) return w;
    return b.priority - a.priority;
  });

  const perSlotUsed = new Set<AluxSpatialProposal["slot"]>();
  const out: AluxSpatialProposal[] = [];

  for (const card of all) {
    if (out.length >= cap) break;
    if (perSlotUsed.has(card.slot)) continue; // 1 por slot (No Saturación)
    if (seen.has(card.id)) continue;           // dedupe sesión

    const proposal = proposalFromDecision(card, input.liveDay);
    if (!proposal) continue; // Regla de Oportunidad

    out.push(proposal);
    perSlotUsed.add(card.slot);
  }

  return out;
}