/**
 * CV6.2 · Decision Center — Now · Next · Later.
 *
 * Founder Decision Center Principle (vinculante):
 *   "Now · Next · Later" NO es una línea de tiempo. Es el Centro de
 *   Decisiones del viajero. Ayuda a decidir, no informa.
 *
 * Este módulo es la capa canónica que compone `DecisionCard[]` a partir
 * de fuentes ya existentes — Travel Plan Contract (`travel_plan_items`),
 * `LiveDayContext` (CV6.1), `DestinationContext` extensible (CV6.1) y
 * señales opcionales del Concierge/Alux — sin introducir nuevos modelos
 * ni fuentes de datos propias. Sub-olas futuras (clima, tráfico,
 * disponibilidad, cambios del Concierge, promos cercanas) se conectan
 * como `DecisionContributor` aditivos, sin refactor de firmas.
 *
 * Reglas invariantes (ver `mem://policies/founder-decision-center.md`):
 *  1. Jerarquía por tarjeta: acción → motivo → contexto → secundarias.
 *  2. Priorización automática por impacto experiencial.
 *  3. Auto-hide: si una tarjeta no aporta valor accionable, no se emite.
 *  4. Prohibido motor paralelo — reutilizar Context Engine, Travel Plan
 *     Contract, Google Maps, Concierge, Signal Contract, Alux Registry.
 *
 * CV6.2 (esta ola) cablea el esqueleto y los 3 contribuyentes base
 * derivados de Live Day (now / next / later del plan). El resto queda
 * documentado como puntos de extensión listos para CV6.3+.
 */

import type {
  DestinationContext,
  LiveDayContext,
  LiveDayItemInput,
} from "@/lib/traveler/live-day";
import type { TripPhase } from "@/lib/traveler/trip-phase";

/** Ranura conceptual del Centro de Decisiones. */
export type DecisionSlot = "now" | "next" | "later";

/**
 * Prioridad numérica (mayor = más importante).
 * Rangos sugeridos por familia (no persistidos):
 *  - 90-100 · alertas críticas (cierre, alerta climática, cambio Concierge)
 *  - 70-89  · salidas inmediatas / acciones vencidas
 *  - 50-69  · ítem en curso
 *  - 30-49  · próximo ítem del día
 *  - 10-29  · preparación para más tarde
 *  - 0-9    · complementos/curiosidades
 */
export type DecisionPriority = number;

/** Tono visual sugerido — consumidor decide el mapping a tokens DSL. */
export type DecisionTone = "neutral" | "info" | "success" | "warning" | "critical";

/** Origen (auditoría + trazabilidad, siguiendo Explainable by Default). */
export type DecisionSource =
  | "travel_plan"
  | "live_day"
  | "destination_context"
  | "concierge"
  | "alux"
  | "geolocation";

/** Acción concreta sugerida al viajero (Action First). */
export interface DecisionAction {
  id: string;
  label: string;
  /** Intent semántico: consumidores mapean a handler concreto. */
  intent:
    | "navigate"
    | "open_map"
    | "open_voucher"
    | "call"
    | "message_concierge"
    | "confirm"
    | "reorganize"
    | "view_alternative"
    | "open_plan_item"
    | "custom";
  href?: string;
  payload?: Record<string, unknown>;
}

/** Tarjeta canónica del Decision Center. */
export interface DecisionCard {
  id: string;
  slot: DecisionSlot;
  priority: DecisionPriority;
  tone: DecisionTone;
  /** 1 · ¿Qué debo hacer AHORA? */
  primaryAction?: DecisionAction;
  /** 2 · ¿Por qué? — Motivo explicable (Explainable by Default). */
  rationale: string;
  /** Título breve — expresa la decisión, no el dato. */
  title: string;
  /** 3 · Contexto complementario (mín. lo necesario para decidir). */
  context?: string;
  /** 4 · Acciones secundarias — nunca compiten con la principal. */
  secondaryActions?: DecisionAction[];
  /** Trazabilidad: fuentes que produjeron la recomendación. */
  sources: DecisionSource[];
  /** Referencia opcional al ítem del plan que originó la decisión. */
  planItemId?: string | null;
  /** Timestamp objetivo (ISO) — sólo para desempate estable. */
  at?: string | null;
}

/** Entrada de un contribuyente al Decision Center. */
export interface DecisionContributorInput {
  phase: TripPhase;
  liveDay: LiveDayContext | null;
  destination?: DestinationContext;
  at: Date;
}

/**
 * Contribuyente aditivo. CV6.2 declara los contribuyentes base (plan/
 * live_day). CV6.3+ registrará clima, tráfico, Concierge, Alux, etc.
 */
export interface DecisionContributor {
  id: string;
  contribute(input: DecisionContributorInput): DecisionCard[];
}

/** Salida del Decision Center por ranura. */
export interface DecisionCenter {
  now: DecisionCard[];
  next: DecisionCard[];
  later: DecisionCard[];
  /** true cuando NO hay ninguna tarjeta útil — consumidor debe ocultar. */
  empty: boolean;
}

// ---------------------------------------------------------------------------
// Contribuyentes base (CV6.2)
// ---------------------------------------------------------------------------

function itemTitle(item: LiveDayItemInput): string {
  // Los consumidores enriquecen con nombres reales vía join; aquí sólo
  // se garantiza un título estable y no vacío para el esqueleto.
  if (item.entity_type && item.entity_id) {
    return `Ítem del itinerario`;
  }
  return `Actividad del día`;
}

function humanTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Contribuyente `live_day.now` — el ítem en curso se convierte en una
 * decisión de "seguir/navegar/abrir voucher".
 */
export const liveDayNowContributor: DecisionContributor = {
  id: "live_day.now",
  contribute({ liveDay }) {
    if (!liveDay || liveDay.nowIndex == null) return [];
    const item = liveDay.items[liveDay.nowIndex];
    if (!item) return [];
    const startedAt = humanTime(item.starts_at);
    return [
      {
        id: `now:${item.id}`,
        slot: "now",
        priority: 60,
        tone: "success",
        title: itemTitle(item),
        rationale: startedAt
          ? `Comenzó a las ${startedAt}. Aprovecha el momento.`
          : `Es tu actividad en curso ahora mismo.`,
        primaryAction: {
          id: "open_plan_item",
          label: "Abrir en Mi Viaje",
          intent: "open_plan_item",
          payload: { planItemId: item.id },
        },
        secondaryActions: [
          {
            id: "open_map",
            label: "Abrir mapa",
            intent: "open_map",
            payload: { planItemId: item.id },
          },
        ],
        sources: ["travel_plan", "live_day"],
        planItemId: item.id,
        at: item.starts_at ?? null,
      },
    ];
  },
};

/**
 * Contribuyente `live_day.next` — próximo ítem del día. Si arranca
 * pronto (≤ 30 min), escala prioridad como "salida inmediata".
 */
export const liveDayNextContributor: DecisionContributor = {
  id: "live_day.next",
  contribute({ liveDay, at }) {
    if (!liveDay || liveDay.nextIndex == null) return [];
    const item = liveDay.items[liveDay.nextIndex];
    if (!item) return [];
    const startsAt = item.starts_at ? new Date(item.starts_at) : null;
    const minsUntil = startsAt
      ? Math.round((startsAt.getTime() - at.getTime()) / 60_000)
      : null;
    const soon = minsUntil != null && minsUntil <= 30 && minsUntil >= 0;
    const label = startsAt ? humanTime(item.starts_at) : undefined;

    return [
      {
        id: `next:${item.id}`,
        slot: "next",
        // Salida inmediata escala a 75 (por encima del "en curso" para
        // forzar decisión de salir). Ítem lejano cae a 35.
        priority: soon ? 75 : 35,
        tone: soon ? "warning" : "info",
        title: soon ? "Sal ahora" : "Próxima actividad",
        rationale: soon
          ? `Comienza en ${minsUntil} min${label ? ` (${label})` : ""}. Sal para llegar a tiempo.`
          : label
            ? `Programada para las ${label}.`
            : `Siguiente en tu día.`,
        primaryAction: {
          id: soon ? "navigate" : "open_plan_item",
          label: soon ? "Iniciar navegación" : "Ver detalle",
          intent: soon ? "navigate" : "open_plan_item",
          payload: { planItemId: item.id },
        },
        secondaryActions: soon
          ? [
              {
                id: "open_plan_item",
                label: "Ver en Mi Viaje",
                intent: "open_plan_item",
                payload: { planItemId: item.id },
              },
            ]
          : undefined,
        sources: ["travel_plan", "live_day"],
        planItemId: item.id,
        at: item.starts_at ?? null,
      },
    ];
  },
};

/**
 * Contribuyente `live_day.later` — ítems restantes del día ordenados
 * canónicamente. Emite máximo N tarjetas (default 3) para no saturar.
 */
export const liveDayLaterContributor: DecisionContributor = {
  id: "live_day.later",
  contribute({ liveDay }) {
    if (!liveDay) return [];
    const startFrom =
      liveDay.nextIndex != null
        ? liveDay.nextIndex + 1
        : liveDay.nowIndex != null
          ? liveDay.nowIndex + 1
          : 0;
    const later = liveDay.items.slice(startFrom, startFrom + 3);
    return later.map((item, i) => {
      const label = humanTime(item.starts_at);
      return {
        id: `later:${item.id}`,
        slot: "later",
        priority: Math.max(10, 25 - i * 5),
        tone: "neutral",
        title: "Más tarde",
        rationale: label
          ? `Programada para las ${label}. Puedes prepararte desde ahora.`
          : `Parte de tu día — considérala al planear los tiempos.`,
        context: label,
        primaryAction: {
          id: "open_plan_item",
          label: "Ver detalle",
          intent: "open_plan_item",
          payload: { planItemId: item.id },
        },
        sources: ["travel_plan", "live_day"],
        planItemId: item.id,
        at: item.starts_at ?? null,
      } satisfies DecisionCard;
    });
  },
};

/** Contribuyentes activos en CV6.2 (aditivo, sin refactor futuro). */
export const CV6_2_BASE_CONTRIBUTORS: DecisionContributor[] = [
  liveDayNowContributor,
  liveDayNextContributor,
  liveDayLaterContributor,
];

// ---------------------------------------------------------------------------
// Motor de composición
// ---------------------------------------------------------------------------

function sortBySlotAndPriority(cards: DecisionCard[]): DecisionCard[] {
  return [...cards].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const ta = a.at ? new Date(a.at).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.at ? new Date(b.at).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Guard de utilidad (Auto-Hide Rule).
 * Una tarjeta se descarta si carece de acción principal Y su rationale
 * es puramente descriptivo (no hay decisión que facilitar).
 */
export function isActionable(card: DecisionCard): boolean {
  if (card.primaryAction) return true;
  // Alertas críticas pueden no tener acción; se conservan sólo si son
  // de prioridad alta (≥ 80) y con tono `critical`/`warning`.
  if (card.priority >= 80 && (card.tone === "critical" || card.tone === "warning")) {
    return true;
  }
  return false;
}

/**
 * Deriva el Centro de Decisiones aplicando la jerarquía y priorización
 * canónica. Sólo compone; NO consulta datos.
 */
export function deriveDecisionCenter(
  input: DecisionContributorInput,
  contributors: DecisionContributor[] = CV6_2_BASE_CONTRIBUTORS,
): DecisionCenter {
  // Auto-Hide global: fuera de `onsite` el Decision Center no se emite.
  // Sub-olas futuras (post-viaje, planificación anticipada) pueden
  // ampliar este contrato — por ahora el foco es "durante el destino".
  if (input.phase !== "onsite") {
    return { now: [], next: [], later: [], empty: true };
  }

  const all: DecisionCard[] = [];
  for (const c of contributors) {
    try {
      all.push(...c.contribute(input));
    } catch {
      // Un contribuyente defectuoso no debe romper el centro.
    }
  }

  const actionable = all.filter(isActionable);
  const now = sortBySlotAndPriority(actionable.filter((c) => c.slot === "now"));
  const next = sortBySlotAndPriority(actionable.filter((c) => c.slot === "next"));
  const later = sortBySlotAndPriority(actionable.filter((c) => c.slot === "later"));

  return {
    now,
    next,
    later,
    empty: now.length + next.length + later.length === 0,
  };
}