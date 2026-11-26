export const TAXI_SETTINGS_KEY = "taxi_alux.settings";
export const TAXI_PAYMENT_METHOD = "efectivo" as const;

export const TAXI_RIDE_STATUSES = [
  "requested",
  "accepted",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type TaxiRideStatus = (typeof TAXI_RIDE_STATUSES)[number];

export interface TaxiSettings {
  enabled: boolean;
  base_fare_cents: number;
  per_km_cents: number;
  per_minute_cents: number;
  minimum_fare_cents: number;
  night_surcharge_bps: number;
  currency: string;
}

export interface TaxiPublicConfig extends TaxiSettings {
  available_drivers: number;
}

export interface TaxiQuote {
  distance_km: number;
  estimated_minutes: number;
  fare_amount: number;
  currency: string;
  night_surcharge: boolean;
}

export interface TaxiDriver {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  phone: string | null;
  english: boolean;
  languages: string[];
  license_number: string | null;
  vehicle_description: string;
  plates: string;
  insurance_reference: string | null;
  union_name: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_number: string | null;
  approved: boolean;
  is_available: boolean;
  last_location_lat: number | null;
  last_location_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
}

export interface TaxiRide {
  id: string;
  folio: string;
  traveler_id: string;
  driver_id: string | null;
  status: TaxiRideStatus;
  origin_label: string;
  origin_lat: number;
  origin_lng: number;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  distance_km: number;
  estimated_minutes: number;
  fare_amount: number;
  currency: string;
  passengers: number;
  requested_for: string;
  payment_method: typeof TAXI_PAYMENT_METHOD;
  cash_paid: boolean;
  traveler_name: string;
  traveler_phone: string;
  notes: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type TaxiOpenRide = Pick<
  TaxiRide,
  | "id"
  | "folio"
  | "status"
  | "origin_label"
  | "origin_lat"
  | "origin_lng"
  | "destination_label"
  | "destination_lat"
  | "destination_lng"
  | "distance_km"
  | "estimated_minutes"
  | "fare_amount"
  | "currency"
  | "passengers"
  | "requested_for"
  | "created_at"
>;

export interface TaxiDriverInvitation {
  id: string;
  token: string;
  invited_name: string | null;
  invited_email: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  full_name: string | null;
  email: string | null;
  phone: string | null;
  english: boolean;
  languages: string[];
  union_name: string | null;
  license_number: string | null;
  insurance_reference: string | null;
  vehicle_description: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_number: string | null;
  plates: string | null;
  applicant_notes: string | null;
  created_at: string;
  expires_at: string;
  submitted_at: string | null;
  driver_id: string | null;
}

export interface TaxiTracking {
  driver_id: string;
  display_name: string;
  vehicle_description: string;
  plates: string;
  languages: string[];
  english: boolean;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  location_stale: boolean;
}

export const DEFAULT_TAXI_SETTINGS: TaxiSettings = {
  enabled: false,
  base_fare_cents: 4000,
  per_km_cents: 1800,
  per_minute_cents: 400,
  minimum_fare_cents: 8000,
  night_surcharge_bps: 1500,
  currency: "MXN",
};

function safeInteger(value: unknown, fallback: number, max = 2_000_000): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max
    ? value
    : fallback;
}

export function normalizeTaxiSettings(raw: unknown): TaxiSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: value.enabled === true,
    base_fare_cents: safeInteger(value.base_fare_cents, DEFAULT_TAXI_SETTINGS.base_fare_cents),
    per_km_cents: safeInteger(value.per_km_cents, DEFAULT_TAXI_SETTINGS.per_km_cents),
    per_minute_cents: safeInteger(value.per_minute_cents, DEFAULT_TAXI_SETTINGS.per_minute_cents),
    minimum_fare_cents: safeInteger(
      value.minimum_fare_cents,
      DEFAULT_TAXI_SETTINGS.minimum_fare_cents,
    ),
    night_surcharge_bps: safeInteger(
      value.night_surcharge_bps,
      DEFAULT_TAXI_SETTINGS.night_surcharge_bps,
      10_000,
    ),
    currency: value.currency === "MXN" ? "MXN" : "MXN",
  };
}

export function normalizeTaxiPublicConfig(raw: unknown): TaxiPublicConfig {
  const settings = normalizeTaxiSettings(raw);
  const count =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>).available_drivers : 0;
  return {
    ...settings,
    available_drivers: typeof count === "number" && Number.isInteger(count) ? Math.max(0, count) : 0,
  };
}

export function taxiRequestBlockReason(input: {
  enabled: boolean;
  availableDrivers: number;
  authenticated: boolean;
}): "taxi_service_disabled" | "no_drivers_available" | "authentication_required" | null {
  if (!input.enabled) return "taxi_service_disabled";
  if (!input.authenticated) return "authentication_required";
  if (input.availableDrivers < 1) return "no_drivers_available";
  return null;
}

export function isTaxiRideActive(status: TaxiRideStatus): boolean {
  return status === "requested" || status === "accepted" || status === "arrived" || status === "in_progress";
}

export function nextDriverRideStatus(status: TaxiRideStatus): "arrived" | "in_progress" | "completed" | null {
  if (status === "accepted") return "arrived";
  if (status === "arrived") return "in_progress";
  if (status === "in_progress") return "completed";
  return null;
}

export function canCancelTaxiRide(status: TaxiRideStatus): boolean {
  return status === "requested" || status === "accepted";
}

export function taxiDriverApplicationBlockReason(
  application: Pick<
    TaxiDriverInvitation,
    "status" | "english" | "email" | "full_name" | "vehicle_description" | "plates"
  >,
): "invitation_not_available" | "driver_english_required" | "missing_driver_details" | null {
  if (application.status !== "submitted") return "invitation_not_available";
  if (!application.english) return "driver_english_required";
  if (!application.email || !application.full_name || !application.vehicle_description || !application.plates) {
    return "missing_driver_details";
  }
  return null;
}

export const TAXI_STATUS_LABELS: Record<TaxiRideStatus, string> = {
  requested: "Solicitud enviada",
  accepted: "Taxi asignado",
  arrived: "Tu taxi llegó",
  in_progress: "Viaje en curso",
  completed: "Viaje realizado",
  cancelled: "Cancelado",
};

export function formatTaxiMoney(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatTaxiDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Merida",
  }).format(new Date(value));
}

export function taxiErrorMessage(message: string): string {
  if (message.includes("taxi_service_disabled")) return "Taxi Alux está desactivado por ahora.";
  if (message.includes("no_drivers_available")) return "No hay taxistas disponibles en este momento.";
  if (message.includes("authentication_required")) return "Crea tu cuenta o inicia sesión para pedir tu taxi.";
  if (message.includes("active_ride_exists")) return "Ya tienes un viaje activo. Termínalo o cancélalo antes de pedir otro.";
  if (message.includes("ride_no_longer_available")) return "Otro taxista ya tomó esta solicitud.";
  if (message.includes("driver_not_approved")) return "Tu cuenta de taxista aún no está autorizada.";
  if (message.includes("driver_english_required")) return "Confirma el inglés del taxista antes de aprobarlo.";
  if (message.includes("cash_only")) return "En esta etapa el viaje se paga únicamente en efectivo al conductor.";
  if (message.includes("invalid_ride_transition")) return "Primero completa el paso anterior del viaje.";
  if (message.includes("ride_cannot_be_cancelled")) return "Este viaje ya no puede cancelarse desde la aplicación.";
  if (message.includes("forbidden")) return "Sólo el administrador puede realizar esta acción.";
  if (message.includes("invalid_taxi_distance")) return "Revisa el origen y el destino del viaje.";
  return "No pudimos completar la acción. Intenta de nuevo.";
}

/* ── Estadísticas y bitácora de pagos (efectivo directo al conductor) ── */

export interface TaxiLedgerEntry {
  ride_id: string;
  folio: string;
  paid_at: string;
  driver_id: string | null;
  driver_name: string;
  vehicle: string;
  traveler_name: string;
  traveler_phone: string;
  route: string;
  distance_km: number;
  amount: number;
  currency: string;
  method: string;
}

type LedgerDriver = Pick<TaxiDriver, "id" | "display_name" | "plates"> & { vehicle_number?: string | null };

/** Solo los viajes terminados con efectivo cobrado entran a la bitácora, del más reciente al más antiguo. */
export function buildTaxiLedger(rides: TaxiRide[], drivers: LedgerDriver[]): TaxiLedgerEntry[] {
  const byId = new Map(drivers.map((d) => [d.id, d]));
  return rides
    .filter((r) => r.status === "completed" && r.cash_paid)
    .map((r) => {
      const d = r.driver_id ? byId.get(r.driver_id) : undefined;
      return {
        ride_id: r.id,
        folio: r.folio,
        paid_at: r.completed_at ?? r.updated_at,
        driver_id: r.driver_id,
        driver_name: d?.display_name ?? "Conductor",
        vehicle: d ? `${d.vehicle_number ? `No. ${d.vehicle_number} · ` : ""}${d.plates}` : "",
        traveler_name: r.traveler_name,
        traveler_phone: r.traveler_phone,
        route: `${r.origin_label} → ${r.destination_label}`,
        distance_km: r.distance_km,
        amount: r.fare_amount,
        currency: r.currency,
        method: "Efectivo al conductor",
      };
    })
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
}

export interface TaxiStats {
  completed: number;
  cancelled: number;
  completionRate: number; // 0..100 sobre viajes cerrados
  cashTotal: number;
  totalKm: number;
  avgMinutes: number;
  byDriver: { driver_id: string; driver_name: string; rides: number; cash: number }[];
}

export function buildTaxiStats(rides: TaxiRide[], drivers: LedgerDriver[]): TaxiStats {
  const ledger = buildTaxiLedger(rides, drivers);
  const done = rides.filter((r) => r.status === "completed");
  const cancelled = rides.filter((r) => r.status === "cancelled").length;
  const closed = done.length + cancelled;
  const per = new Map<string, { driver_id: string; driver_name: string; rides: number; cash: number }>();
  for (const e of ledger) {
    const key = e.driver_id ?? "—";
    const row = per.get(key) ?? { driver_id: key, driver_name: e.driver_name, rides: 0, cash: 0 };
    row.rides += 1;
    row.cash += e.amount;
    per.set(key, row);
  }
  return {
    completed: done.length,
    cancelled,
    completionRate: closed ? Math.round((done.length / closed) * 100) : 0,
    cashTotal: ledger.reduce((s, e) => s + e.amount, 0),
    totalKm: Math.round(done.reduce((s, r) => s + r.distance_km, 0) * 10) / 10,
    avgMinutes: done.length ? Math.round(done.reduce((s, r) => s + r.estimated_minutes, 0) / done.length) : 0,
    byDriver: [...per.values()].sort((a, b) => b.cash - a.cash),
  };
}

/** Viajes y efectivo cobrado por el conductor en el día local indicado (AAAA-MM-DD). */
export function driverDaySummary(rides: TaxiRide[], day: string): { rides: number; cash: number } {
  const mine = rides.filter((r) => r.status === "completed" && r.cash_paid && localDay(r.completed_at ?? r.updated_at) === day);
  return { rides: mine.length, cash: mine.reduce((s, r) => s + r.fare_amount, 0) };
}

export function localDay(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function taxiLedgerCsv(entries: TaxiLedgerEntry[]): string {
  const head = ["Fecha", "Folio", "Conductor", "Vehículo", "Viajero", "Teléfono", "Ruta", "Km", "Importe", "Moneda", "Forma de pago"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [e.paid_at, e.folio, e.driver_name, e.vehicle, e.traveler_name, e.traveler_phone, e.route, e.distance_km, (e.amount / 100).toFixed(2), e.currency, e.method].map(esc).join(","),
  );
  return [head.map(esc).join(","), ...rows].join("\n");
}
