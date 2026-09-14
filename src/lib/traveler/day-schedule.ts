/**
 * CV6.7 · Day Schedule Builder (puro).
 *
 * Construye un horario SUGERIDO para un día del itinerario a partir de:
 *   · el orden actual de las actividades del día,
 *   · los horarios reales del negocio (`business_hours`) cuando existen,
 *   · la distancia entre paradas (traslado estimado),
 *   · una duración típica por tipo de actividad.
 *
 * Reglas Founder:
 *   · Nunca inventa horarios "en firme": el resultado se marca como
 *     sugerencia (`schedule_source = 'alux'`) y el viajero puede ajustarlo.
 *   · Respeta lo ya confirmado: las horas con origen `traveler` o
 *     `concierge` no se mueven; el resto se acomoda alrededor.
 *   · Si un negocio abre más tarde, la actividad se recorre a su apertura.
 *   · Puro y determinístico: sin red, sin DB, sin `Date.now()`.
 *
 * Zona horaria: todas las horas son LOCALES del destino (America/Merida).
 */

export type ScheduleSource = "concierge" | "alux" | "traveler";

export interface ScheduleItemInput {
  id: string;
  item_kind: string;
  starts_at_local?: string | null;
  duration_minutes?: number | null;
  schedule_source?: ScheduleSource | null;
  /** Coordenadas conocidas de la parada, si las hay. */
  geo?: { lat: number; lng: number } | null;
  /** Franjas de apertura del día evaluado (HH:MM), si se conocen. */
  openSlots?: Array<{ opens: string; closes: string }> | null;
  /** true cuando la fuente declara el día como cerrado. */
  closedToday?: boolean;
}

export interface ScheduleAssignment {
  id: string;
  startsAtLocal: string;
  durationMinutes: number;
  /** Motivo editorial por parada (explicable). */
  reason: string;
  /** true si la hora ya venía confirmada y no se modificó. */
  locked: boolean;
}

export interface BuildDayScheduleResult {
  assignments: ScheduleAssignment[];
  skipped: string[];
  rationale: string;
  sources: string[];
}

/** Duración típica por tipo de actividad (minutos). */
const DEFAULT_DURATION: Record<string, number> = {
  business: 90,
  place: 120,
  destination: 150,
  product: 120,
  event: 120,
  route: 240,
  note: 30,
};

const DAY_START = 9 * 60; // 09:00
const DAY_END = 21 * 60; // 21:00
const MIN_TRANSFER = 15; // minutos entre paradas sin geo
const AVG_SPEED_KMH = 40;

export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function fromMinutes(total: number): string {
  const n = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function transferMinutes(
  from: ScheduleItemInput | null,
  to: ScheduleItemInput,
): { minutes: number; known: boolean } {
  if (from?.geo && to.geo) {
    const km = haversineKm(from.geo, to.geo);
    const mins = Math.round((km / AVG_SPEED_KMH) * 60 * 1.25) + 5;
    return { minutes: Math.max(10, Math.min(180, mins)), known: true };
  }
  return { minutes: MIN_TRANSFER, known: false };
}

/** Primera apertura del día útil para una hora objetivo. */
function openingFor(item: ScheduleItemInput, desired: number): number | null {
  const slots = (item.openSlots ?? [])
    .map((s) => ({ opens: toMinutes(s.opens), closes: toMinutes(s.closes) }))
    .filter((s): s is { opens: number; closes: number } => s.opens != null && s.closes != null)
    .sort((a, b) => a.opens - b.opens);
  if (slots.length === 0) return null;
  for (const s of slots) {
    const end = s.closes <= s.opens ? s.closes + 1440 : s.closes;
    if (desired < s.opens) return s.opens;
    if (desired < end) return desired;
  }
  return null; // ya cerró: no forzamos una hora imposible
}

export function buildDaySchedule(
  items: ScheduleItemInput[],
  opts: { dayStart?: number } = {},
): BuildDayScheduleResult {
  const assignments: ScheduleAssignment[] = [];
  const skipped: string[] = [];
  const sources = new Set<string>(["Orden del itinerario", "Duración típica por tipo"]);

  let cursor = opts.dayStart ?? DAY_START;
  let previous: ScheduleItemInput | null = null;
  let movedByHours = 0;
  let withGeo = 0;

  for (const item of items) {
    const duration =
      typeof item.duration_minutes === "number" && item.duration_minutes > 0
        ? item.duration_minutes
        : (DEFAULT_DURATION[item.item_kind] ?? 90);

    const confirmed =
      (item.schedule_source === "traveler" || item.schedule_source === "concierge") &&
      toMinutes(item.starts_at_local) != null;

    if (confirmed) {
      const start = toMinutes(item.starts_at_local)!;
      assignments.push({
        id: item.id,
        startsAtLocal: fromMinutes(start),
        durationMinutes: duration,
        reason:
          item.schedule_source === "concierge"
            ? "Hora definida por tu concierge."
            : "Hora que tú confirmaste.",
        locked: true,
      });
      cursor = Math.max(cursor, start + duration);
      previous = item;
      continue;
    }

    const transfer = previous ? transferMinutes(previous, item) : { minutes: 0, known: false };
    if (transfer.known) {
      withGeo += 1;
      sources.add("Distancia entre paradas");
    }
    let desired = cursor + transfer.minutes;

    if (item.closedToday) {
      skipped.push(item.id);
      continue;
    }

    if (item.openSlots && item.openSlots.length > 0) {
      sources.add("Horarios publicados del lugar");
      const fit = openingFor(item, desired);
      if (fit == null) {
        skipped.push(item.id);
        continue;
      }
      if (fit > desired) movedByHours += 1;
      desired = fit;
    }

    if (desired >= DAY_END) {
      skipped.push(item.id);
      continue;
    }

    assignments.push({
      id: item.id,
      startsAtLocal: fromMinutes(desired),
      durationMinutes: duration,
      reason:
        item.openSlots && item.openSlots.length > 0
          ? "Ajustada al horario de apertura del lugar."
          : "Propuesta según el orden del día y el traslado estimado.",
      locked: false,
    });
    cursor = desired + duration;
    previous = item;
  }

  const parts: string[] = [];
  parts.push(
    `Alux propuso horarios para ${assignments.filter((a) => !a.locked).length} de ${items.length} actividades.`,
  );
  if (movedByHours > 0) {
    parts.push(`${movedByHours} se recorrieron para respetar el horario de apertura.`);
  }
  if (withGeo > 0) parts.push("Se consideró el traslado entre paradas.");
  if (skipped.length > 0) {
    parts.push(`${skipped.length} no cupieron en el día o el lugar estaba cerrado.`);
  }
  parts.push("Es una sugerencia: puedes ajustar cada hora.");

  return {
    assignments,
    skipped,
    rationale: parts.join(" "),
    sources: Array.from(sources),
  };
}
