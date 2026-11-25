/**
 * Pantalla de caja: reglas puras para pintar cada mesa como libre, reservada u ocupada.
 */
export interface CashierReservation {
  id: string;
  table_id: string | null;
  party_size: number;
  status: string;
  starts_at: string;
  ends_at: string;
  source: string;
  guest: string;
}
export interface CashierTable { id: string; label: string; seats: number; zone: string }
export type CashierTableState =
  | { kind: "ocupada"; reservation: CashierReservation }
  | { kind: "reservada"; reservation: CashierReservation }
  | { kind: "libre" };

/** Ventana en la que una reserva próxima ya aparta la mesa en la caja. */
export const UPCOMING_MINUTES = 45;

export function cashierTableState(table: CashierTable, list: ReadonlyArray<CashierReservation>, now: Date): CashierTableState {
  const t = now.getTime();
  const mine = list.filter((r) => r.table_id === table.id);
  const seated = mine.find((r) => r.status === "sentada" && new Date(r.ends_at).getTime() > t);
  if (seated) return { kind: "ocupada", reservation: seated };
  const next = mine
    .filter((r) => ["pendiente", "confirmada", "llego"].includes(r.status))
    .filter((r) => {
      const s = new Date(r.starts_at).getTime();
      return s - t <= UPCOMING_MINUTES * 60_000 && new Date(r.ends_at).getTime() > t;
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  return next ? { kind: "reservada", reservation: next } : { kind: "libre" };
}

/** Mesas del plano; si no hay plano, se numeran desde los grupos «N mesas de M lugares». */
export function cashierTables(plan: ReadonlyArray<CashierTable>, groups: ReadonlyArray<{ seats: number; count: number }>): CashierTable[] {
  if (plan.length > 0) return plan.map((p) => ({ id: p.id, label: p.label, seats: p.seats, zone: p.zone }));
  const out: CashierTable[] = [];
  let n = 0;
  for (const g of groups) for (let i = 0; i < Math.min(g.count, 60); i++) {
    n++;
    out.push({ id: `m${n}`, label: `Mesa ${n}`, seats: g.seats, zone: "Salón" });
  }
  return out;
}

export function isValidCashierPin(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}
