/**
 * Reservar mesa · Etapa 2: plano de mesas, ficha del comensal y reportes.
 * Reglas puras (sin red) para que el Portal y las pruebas usen la misma lógica.
 */
import { occupiesTable, type TableGroup } from "@/lib/commerce/table-booking";

export const FLOOR_COLS = 12;
export const FLOOR_ROWS = 10;

export interface FloorTable {
  id: string;
  label: string;
  seats: number;
  zone: string;
  x: number;
  y: number;
  round?: boolean;
}

/** Plano inicial a partir de los grupos «N mesas de M lugares» de la Etapa 1. */
export function floorFromGroups(groups: ReadonlyArray<TableGroup>): FloorTable[] {
  const out: FloorTable[] = [];
  let n = 0;
  for (const g of groups) {
    for (let i = 0; i < Math.min(g.count, 60); i++) {
      n++;
      const pos = n - 1;
      out.push({
        id: `m${n}`, label: `Mesa ${n}`, seats: g.seats, zone: "Salón",
        x: (pos % 4) * 3, y: Math.floor(pos / 4) * 2, round: g.seats <= 2,
      });
    }
  }
  return out;
}

export function clampFloor(t: FloorTable): FloorTable {
  return {
    ...t,
    x: Math.min(Math.max(Math.round(t.x), 0), FLOOR_COLS - 2),
    y: Math.min(Math.max(Math.round(t.y), 0), FLOOR_ROWS - 1),
    seats: Math.min(Math.max(Math.round(t.seats), 1), 30),
    label: t.label.trim().slice(0, 20) || "Mesa",
    zone: t.zone.trim().slice(0, 30) || "Salón",
  };
}

/** Cuenta las mesas por tamaño, para mantener la disponibilidad pública igual al plano. */
export function groupsFromFloor(plan: ReadonlyArray<FloorTable>): TableGroup[] {
  const m = new Map<number, number>();
  for (const t of plan) m.set(t.seats, (m.get(t.seats) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([seats, count]) => ({ seats, count }));
}

/** Llave estable del comensal: últimos 10 dígitos del teléfono. */
export function phoneKey(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-10) : null;
}

export interface ReportRow { starts_at: string; party_size: number; status: string; source: string }

export interface TableReport {
  reservations: number;
  guests: number;
  noShows: number;
  noShowRate: number;
  cancelled: number;
  platformGuests: number;
  bySource: Record<string, number>;
  byHour: Record<string, number>;
}

const SERVED = new Set(["llego", "sentada", "terminada"]);

export function buildTableReport(rows: ReadonlyArray<ReportRow>): TableReport {
  const r: TableReport = { reservations: 0, guests: 0, noShows: 0, noShowRate: 0, cancelled: 0, platformGuests: 0, bySource: {}, byHour: {} };
  let decided = 0;
  for (const row of rows) {
    r.reservations++;
    if (row.status === "cancelada" || row.status === "rechazada") { r.cancelled++; continue; }
    if (row.status === "no_vino") { r.noShows++; decided++; continue; }
    if (SERVED.has(row.status)) {
      decided++;
      r.guests += row.party_size;
      if (row.source === "pagina" || row.source === "alux" || row.source === "whatsapp") r.platformGuests += row.party_size;
      r.bySource[row.source] = (r.bySource[row.source] ?? 0) + row.party_size;
      const h = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", hour12: false, timeZone: "America/Merida" }).format(new Date(row.starts_at));
      r.byHour[h] = (r.byHour[h] ?? 0) + row.party_size;
    }
  }
  r.noShowRate = decided ? Math.round((r.noShows / decided) * 100) : 0;
  return r;
}

export interface GuestVisit { starts_at: string; party_size: number; status: string }

export function guestSummary(visits: ReadonlyArray<GuestVisit>, now: Date = new Date()) {
  const past = visits.filter((v) => new Date(v.starts_at) <= now);
  const came = past.filter((v) => SERVED.has(v.status));
  const last = came.map((v) => v.starts_at).sort().at(-1) ?? null;
  return {
    visits: came.length,
    noShows: past.filter((v) => v.status === "no_vino").length,
    upcoming: visits.filter((v) => new Date(v.starts_at) > now && occupiesTable(v.status)).length,
    lastVisit: last,
  };
}

export const GUEST_TAGS = ["VIP", "Cliente frecuente", "Alergia", "Vegetariano", "Cumpleaños", "Mesa preferida", "Accesibilidad"] as const;
