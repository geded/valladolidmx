/**
 * Live Day — helper canónico del sub-estado "día en curso" cuando el
 * viajero está en fase `onsite`. Fuente única consumida por
 * `LiveDayBoard`, `FloatingTravelPlanDock` (variante onsite), Alux
 * Espacial y el motor de señales `plan.live_day_*`.
 *
 * Reglas vinculantes:
 *  - No persistir sub-fase. Se DERIVA a partir del plan + `at`.
 *  - No introducir nuevos modelos. Se compone sobre `travel_plan_items`
 *    y sobre el contrato de `DestinationContext` (extensible), definido
 *    por el Founder Destination Awareness Principle.
 *  - Ordenamiento canónico: `day_number` asc, luego `starts_at` asc,
 *    luego `order_index` asc, luego `id` asc como desempate estable.
 *
 * Ver:
 *  - docs/blueprint/16.CV6-LIVE-DESTINATION-COMPANION-v1.0.md (§ 5.1)
 *  - mem://policies/founder-destination-awareness.md
 *  - mem://policies/founder-travel-companion.md
 */

import type { TripPhase } from "@/lib/traveler/trip-phase";

/** Sub-estado dentro de la fase macro `onsite`. */
export type LivePhase = "pre-day" | "in-day" | "post-day";

/** Forma mínima de un ítem del plan requerida por Live Day. */
export interface LiveDayItemInput {
  id: string;
  day_number?: number | null;
  order_index?: number | null;
  starts_at?: string | null; // ISO datetime
  ends_at?: string | null;   // ISO datetime
  status?: "planned" | "done" | "skipped" | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

/** Forma mínima del plan requerida por Live Day. */
export interface LiveDayPlanInput {
  id?: string | null;
  start_date?: string | null; // ISO date
  end_date?: string | null;   // ISO date
  items?: LiveDayItemInput[] | null;
}

/**
 * Contrato extensible para el estado operativo del destino.
 *
 * Ninguna fuente se implementa en CV6.1 — el tipo queda listo para
 * que futuras sub-olas (CV6.3+) inyecten datos sin refactor. Cualquier
 * clave nueva debe consumirse del Context Engine, Google Maps,
 * Concierge o el Signal Contract existente. Prohibido nuevo modelo.
 */
export interface DestinationContext {
  weather?: unknown;         // p.ej. DayWeatherChip data (CV6.3)
  hours?: unknown;           // horarios reales / cierres (CV6+)
  events?: unknown;          // eventos del destino
  traffic?: unknown;         // señales de tráfico (Google Maps)
  availability?: unknown;    // disponibilidad de negocios
  incidents?: unknown;       // incidencias reportadas por Concierge
  recommendations?: unknown; // recomendaciones curadas
  // extensible: sub-olas futuras pueden añadir claves aditivas.
}

export interface LiveDayContext {
  day: number | null;
  livePhase: LivePhase;
  items: LiveDayItemInput[];
  nowIndex: number | null;
  nextIndex: number | null;
  destination?: DestinationContext;
}

function toDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
}

function toISODay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Ordena ítems según el contrato canónico (estable). */
export function sortLiveDayItems(items: LiveDayItemInput[]): LiveDayItemInput[] {
  return [...items].sort((a, b) => {
    const da = a.day_number ?? Number.POSITIVE_INFINITY;
    const db = b.day_number ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const ta = toDate(a.starts_at)?.getTime() ?? Number.POSITIVE_INFINITY;
    const tb = toDate(b.starts_at)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    const oa = a.order_index ?? Number.POSITIVE_INFINITY;
    const ob = b.order_index ?? Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Deriva el número de día (1-based) del viaje a partir de `at` y
 * `plan.start_date`. Devuelve null si no hay start_date o si `at` está
 * fuera del rango del viaje.
 */
export function deriveDayNumber(
  plan: LiveDayPlanInput | null | undefined,
  at: Date,
): number | null {
  const start = toDate(plan?.start_date ?? null);
  const end = toDate(plan?.end_date ?? null);
  if (!start) return null;
  const atDay = new Date(toISODay(at) + "T00:00:00Z").getTime();
  const startDay = new Date(toISODay(start) + "T00:00:00Z").getTime();
  if (atDay < startDay) return null;
  if (end) {
    const endDay = new Date(toISODay(end) + "T00:00:00Z").getTime();
    if (atDay > endDay) return null;
  }
  const diff = Math.round((atDay - startDay) / 86_400_000);
  return diff + 1;
}

/**
 * Deriva el LiveDayContext para una fecha dada.
 *
 * NOTA CV6.1: sólo cablea plan + ítems + orden + índices now/next. Las
 * fuentes del `destination` quedan opt-in vía `opts.destination` sin
 * fetch propio (CV6.3+ integrará Context Engine).
 */
export function deriveLiveDay(
  plan: LiveDayPlanInput | null | undefined,
  at: Date = new Date(),
  opts: { destination?: DestinationContext } = {},
): LiveDayContext {
  const day = deriveDayNumber(plan, at);
  const allItems = sortLiveDayItems(plan?.items ?? []);
  const dayItems = day == null
    ? []
    : allItems.filter((it) => (it.day_number ?? null) === day);

  const nowMs = at.getTime();
  let nowIndex: number | null = null;
  let nextIndex: number | null = null;

  dayItems.forEach((it, i) => {
    const s = toDate(it.starts_at)?.getTime() ?? null;
    const e = toDate(it.ends_at)?.getTime() ?? null;
    if (s != null && s <= nowMs && (e == null || e >= nowMs)) {
      if (nowIndex == null) nowIndex = i;
    }
    if (s != null && s > nowMs && nextIndex == null) nextIndex = i;
  });

  const livePhase = deriveLivePhase(day, dayItems, at);

  return {
    day,
    livePhase,
    items: dayItems,
    nowIndex,
    nextIndex,
    destination: opts.destination,
  };
}

/**
 * Sub-fase dentro de `onsite`:
 *  - `pre-day`  → hoy es día de viaje pero aún no hay ítems iniciados.
 *  - `in-day`   → al menos un ítem está en curso o hay uno próximo hoy.
 *  - `post-day` → todos los ítems del día han terminado.
 * Fuera de `onsite` este helper no debe consultarse.
 */
export function deriveLivePhase(
  day: number | null,
  dayItems: LiveDayItemInput[],
  at: Date,
): LivePhase {
  if (day == null || dayItems.length === 0) return "pre-day";
  const nowMs = at.getTime();
  let anyFuture = false;
  let anyCurrent = false;
  for (const it of dayItems) {
    const s = toDate(it.starts_at)?.getTime() ?? null;
    const e = toDate(it.ends_at)?.getTime() ?? null;
    if (s != null && s > nowMs) anyFuture = true;
    if (s != null && s <= nowMs && (e == null || e >= nowMs)) anyCurrent = true;
  }
  if (anyCurrent || anyFuture) return "in-day";
  return "post-day";
}

/**
 * Guard util: sólo tiene sentido consumir Live Day en fase `onsite`.
 * No lanza — los consumidores deciden qué mostrar fuera de esa fase.
 */
export function isLiveDayApplicable(phase: TripPhase): boolean {
  return phase === "onsite";
}