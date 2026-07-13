/**
 * CV6.8 · Live Recap & Handoff — Pure Domain.
 *
 * Vista COMPLETAMENTE DERIVADA del cierre de día. Reglas vinculantes
 * (`mem://policies/founder-recap-continuity.md`):
 *  1. Founder Continuity Principle — siempre puente al siguiente momento.
 *  2. Recap as Derived View — sin modelo persistente, sin cache, sin
 *     estado paralelo.
 *  3. Single Source Timeline Principle — sólo consume fuentes oficiales
 *     existentes (LiveDay + Plan + DecisionCenter + Concierge).
 *  4. Explainable Summary Principle — cada entrada declara `sources` y
 *     `rationale`.
 *  5. No AI Memory Duplication Principle — sin memoria paralela.
 *
 * Trigger canónico: `phase === "onsite"` && `liveDay.livePhase === "post-day"`.
 */

import type {
  LiveDayContext,
  LiveDayItemInput,
} from "@/lib/traveler/live-day";
import type { TripPhase } from "@/lib/traveler/trip-phase";
import type { DecisionCard } from "@/lib/traveler/decision-center";

export type LiveRecapState =
  | "hidden"
  | "preparing"
  | "ready"
  | "handoff-tomorrow"
  | "handoff-post-trip";

export interface LiveRecapHighlight {
  id: string;
  label: string;
  rationale: string;
  sources: string[];
}

export interface LiveRecapPending {
  id: string;
  label: string;
  rationale: string;
  sources: string[];
}

export interface LiveRecapTomorrowPreview {
  day: number;
  itemsCount: number;
  firstStartAt: string | null;
  rationale: string;
  sources: string[];
}

export interface LiveRecap {
  state: LiveRecapState;
  visible: boolean;
  headline: string;
  rationale: string;
  highlights: LiveRecapHighlight[];
  pendingItems: LiveRecapPending[];
  tomorrowPreview: LiveRecapTomorrowPreview | null;
  reversible: true;
  sources: string[];
  explain: { rules: string[] };
}

export interface LiveRecapInput {
  phase: TripPhase;
  liveDay: LiveDayContext;
  /** TODOS los ítems del plan (para poder derivar día+1). */
  planItems: LiveDayItemInput[];
  /** Fecha fin del viaje (ISO date) — para detectar último día. */
  endDate?: string | null;
  decisionCenter?: {
    now: DecisionCard[];
    next: DecisionCard[];
    later: DecisionCard[];
    empty: boolean;
  };
  assistance?: { state: string; visible: boolean };
  at: Date;
}

const HIDDEN: LiveRecap = {
  state: "hidden",
  visible: false,
  headline: "",
  rationale: "",
  highlights: [],
  pendingItems: [],
  tomorrowPreview: null,
  reversible: true,
  sources: [],
  explain: { rules: [] },
};

function itemLabel(it: LiveDayItemInput): string {
  if (it.entity_type && it.entity_id) return `${it.entity_type}:${it.entity_id}`;
  return `Ítem ${it.id.slice(0, 6)}`;
}

function isLastDay(
  currentDay: number,
  planItems: LiveDayItemInput[],
  endDate: string | null | undefined,
  at: Date,
): boolean {
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      const endISO = end.toISOString().slice(0, 10);
      const atISO = at.toISOString().slice(0, 10);
      return atISO >= endISO;
    }
  }
  // Sin endDate no inferimos el último día (Explainable Summary).
  return false;
}

/**
 * Pure derivador oficial CV6.8. Toda decisión de superficie parte de aquí.
 */
export function deriveLiveRecap(input: LiveRecapInput): LiveRecap {
  const rules: string[] = [];
  const sources: string[] = ["live_day", "travel_plan_contract"];

  if (input.phase !== "onsite") {
    rules.push("phase!=onsite");
    return { ...HIDDEN, explain: { rules } };
  }
  if (input.liveDay.livePhase !== "post-day") {
    rules.push("livePhase!=post-day");
    return { ...HIDDEN, explain: { rules } };
  }
  if (input.liveDay.day == null) {
    rules.push("no_active_day");
    return { ...HIDDEN, explain: { rules } };
  }

  // Highlights = ítems del día con status "done" (Single Source).
  const highlights: LiveRecapHighlight[] = input.liveDay.items
    .filter((it) => it.status === "done")
    .map((it) => ({
      id: `hl:${it.id}`,
      label: itemLabel(it),
      rationale: "Marcado como completado hoy en tu itinerario.",
      sources: ["travel_plan_items"],
    }));

  // Pendientes = ítems del día "planned" cuyo starts_at ya pasó y no fueron
  // hechos ni saltados. Fuente: Travel Plan.
  const nowMs = input.at.getTime();
  const pendingFromPlan: LiveRecapPending[] = input.liveDay.items
    .filter((it) => {
      if (it.status && it.status !== "planned") return false;
      const s = it.starts_at ? new Date(it.starts_at).getTime() : null;
      return s != null && s <= nowMs;
    })
    .map((it) => ({
      id: `pi:${it.id}`,
      label: itemLabel(it),
      rationale: "Quedó pendiente sin marcar como hecho o saltado.",
      sources: ["travel_plan_items"],
    }));

  // Pendientes adicionales desde el Decision Center (Single Source Timeline).
  const dcPending: LiveRecapPending[] = [];
  if (input.decisionCenter) {
    sources.push("decision_center");
    for (const slot of ["now", "next"] as const) {
      for (const c of input.decisionCenter[slot]) {
        dcPending.push({
          id: `dc:${c.id}`,
          label: c.title,
          rationale: c.rationale,
          sources: ["decision_center"],
        });
      }
    }
  }
  const pendingItems = [...pendingFromPlan, ...dcPending];

  // Caso Concierge vigente aporta pendiente prioritario (Single Source).
  if (input.assistance?.visible && input.assistance.state === "case_open") {
    sources.push("on_trip_concierge");
    pendingItems.unshift({
      id: "pi:concierge_case",
      label: "Expediente Concierge activo",
      rationale: "Tienes un expediente abierto que continúa mañana.",
      sources: ["on_trip_concierge"],
    });
  }

  // Tomorrow preview (Founder Continuity Principle).
  const dayNum = input.liveDay.day;
  const tomorrowItems = input.planItems
    .filter((it) => (it.day_number ?? -1) === dayNum + 1)
    .sort((a, b) => {
      const ta = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  const lastDay = isLastDay(dayNum, input.planItems, input.endDate, input.at);

  const tomorrowPreview: LiveRecapTomorrowPreview | null =
    tomorrowItems.length > 0
      ? {
          day: dayNum + 1,
          itemsCount: tomorrowItems.length,
          firstStartAt: tomorrowItems[0]?.starts_at ?? null,
          rationale: "Tu viaje continúa mañana con actividades ya planeadas.",
          sources: ["travel_plan_items"],
        }
      : null;

  // Auto-Hide: sin valor real (Founder Experience First).
  const hasValue =
    highlights.length > 0 ||
    pendingItems.length > 0 ||
    tomorrowPreview != null ||
    lastDay;
  if (!hasValue) {
    rules.push("no_real_value");
    return { ...HIDDEN, explain: { rules } };
  }

  // Preparing: hay end-of-day pero aún no hay evidencia derivable.
  if (highlights.length === 0 && pendingItems.length === 0 && !tomorrowPreview && lastDay) {
    rules.push("last_day_no_evidence");
    return {
      state: "handoff-post-trip",
      visible: true,
      headline: "Tu viaje sigue contigo",
      rationale:
        "Hoy cierra tu estancia. Tu Concierge y Alux continúan disponibles para el regreso.",
      highlights,
      pendingItems,
      tomorrowPreview: null,
      reversible: true,
      sources,
      explain: { rules },
    };
  }

  // Determinar estado final.
  let state: LiveRecapState;
  let headline: string;
  let rationale: string;
  if (lastDay) {
    state = "handoff-post-trip";
    headline = "Tu viaje continúa más allá del destino";
    rationale =
      "Hoy termina tu estancia, pero el viaje no se cierra: tu Concierge y Alux siguen contigo.";
    rules.push("last_day");
  } else if (tomorrowPreview) {
    state = "handoff-tomorrow";
    headline = "Cierre del día · tu viaje sigue mañana";
    rationale =
      "Repasa lo vivido hoy y lo que queda pendiente. Mañana continúas con lo planeado.";
    rules.push("has_tomorrow");
  } else {
    state = "ready";
    headline = "Cierre del día";
    rationale = "Repasa lo vivido hoy y lo que quedó pendiente.";
    rules.push("ready_no_tomorrow");
  }

  return {
    state,
    visible: true,
    headline,
    rationale,
    highlights,
    pendingItems,
    tomorrowPreview,
    reversible: true,
    sources,
    explain: { rules },
  };
}