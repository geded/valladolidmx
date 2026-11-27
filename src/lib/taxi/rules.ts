export const TAXI_SETTINGS_KEY = "taxi_alux.settings";
export const TAXI_PAYMENT_METHOD = "efectivo" as const;

/** El GPS actualiza sólo la recogida, nunca el lugar que motivó el traslado. */
export function taxiWithCurrentOrigin<T extends { origin: { lat: number; lng: number }; originLabel: string }>(
  draft: T,
  point: { lat: number; lng: number },
): T {
  return { ...draft, origin: point, originLabel: "Mi ubicación actual" };
}

export function taxiHasRoute(originLabel: string, destinationLabel: string): boolean {
  return Boolean(originLabel.trim() && destinationLabel.trim());
}

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

export interface TaxiPickupZone {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
}

export const TAXI_VEHICLE_CLASSES = ["compacto", "camioneta", "van"] as const;
export type TaxiVehicleClass = (typeof TAXI_VEHICLE_CLASSES)[number];
export type TaxiTripMode = "one_way" | "hourly";

export interface TaxiVehicleClassRule {
  key: TaxiVehicleClass;
  label: string;
  seats: number;
  /** 10000 = misma tarifa que el compacto. */
  multiplier_bps: number;
}

/** Reglas de flota tipo Uber/DiDi: tipo de auto por tamaño de grupo, espera, paradas y viaje por horas. */
export interface TaxiFleet {
  classes: TaxiVehicleClassRule[];
  wait_free_minutes: number;
  wait_per_minute_cents: number;
  stop_fee_cents: number;
  max_stops: number;
  hourly_enabled: boolean;
  hourly_cents: number;
  hourly_min_hours: number;
  hourly_max_hours: number;
  hourly_included_km: number;
}

export const DEFAULT_TAXI_FLEET: TaxiFleet = {
  classes: [
    { key: "compacto", label: "Compacto", seats: 4, multiplier_bps: 10000 },
    { key: "camioneta", label: "Camioneta", seats: 6, multiplier_bps: 16000 },
    { key: "van", label: "Van", seats: 10, multiplier_bps: 22000 },
  ],
  wait_free_minutes: 3,
  wait_per_minute_cents: 300,
  stop_fee_cents: 1500,
  max_stops: 2,
  hourly_enabled: true,
  hourly_cents: 25000,
  hourly_min_hours: 2,
  hourly_max_hours: 10,
  hourly_included_km: 20,
};

export function normalizeTaxiFleet(raw: unknown): TaxiFleet {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawClasses = Array.isArray(v["classes"]) ? (v["classes"] as Record<string, unknown>[]) : [];
  const classes = DEFAULT_TAXI_FLEET.classes.map((d) => {
    const c = rawClasses.find((x) => x["key"] === d.key) ?? {};
    return {
      key: d.key,
      label: typeof c["label"] === "string" && c["label"].trim() ? c["label"] : d.label,
      seats: safeInteger(c["seats"], d.seats, 20) || d.seats,
      multiplier_bps: safeInteger(c["multiplier_bps"], d.multiplier_bps, 50000) || d.multiplier_bps,
    };
  });
  const n = (k: keyof TaxiFleet, max = 1_000_000) =>
    safeInteger(v[k], DEFAULT_TAXI_FLEET[k] as number, max);
  return {
    classes,
    wait_free_minutes: n("wait_free_minutes", 60),
    wait_per_minute_cents: n("wait_per_minute_cents"),
    stop_fee_cents: n("stop_fee_cents"),
    max_stops: n("max_stops", 5),
    hourly_enabled: v["hourly_enabled"] !== false,
    hourly_cents: n("hourly_cents"),
    hourly_min_hours: n("hourly_min_hours", 24) || 1,
    hourly_max_hours: n("hourly_max_hours", 24) || 1,
    hourly_included_km: n("hourly_included_km", 1000),
  };
}

/** El auto más pequeño donde cabe todo el grupo; null si nadie de la flota lo lleva. */
export function taxiClassForPassengers(fleet: TaxiFleet, passengers: number): TaxiVehicleClassRule | null {
  return [...fleet.classes].sort((a, b) => a.seats - b.seats).find((c) => c.seats >= passengers) ?? null;
}

export function taxiMaxPassengers(fleet: TaxiFleet): number {
  return Math.max(...fleet.classes.map((c) => c.seats));
}

export interface TaxiStop {
  lat: number;
  lng: number;
  label: string;
}

export interface TaxiFareBreakdown {
  base_cents: number;
  extra_km: number;
  extra_km_cents: number;
  included_km: number;
  stops: number;
  stop_fee_cents: number;
  night_cents: number;
  wait_free_minutes: number;
  wait_per_minute_cents: number;
  extra_hour_cents: number;
  extra_km_rate_cents: number;
}

export interface TaxiPublicConfig extends TaxiSettings {
  available_drivers: number;
  drivers_by_class: Partial<Record<TaxiVehicleClass, number>>;
  fleet: TaxiFleet;
  pickup_zones: TaxiPickupZone[];
}

/** Taxistas libres cuyo vehículo lleva al menos los lugares de la clase pedida. */
export function taxiDriversForClass(config: Pick<TaxiPublicConfig, "drivers_by_class" | "fleet">, cls: TaxiVehicleClass): number {
  const need = config.fleet.classes.find((c) => c.key === cls)?.seats ?? 4;
  return config.fleet.classes
    .filter((c) => c.seats >= need)
    .reduce((sum, c) => sum + (config.drivers_by_class[c.key] ?? 0), 0);
}

/** Recogida permitida sólo dentro de un destino de salida marcado por el administrador. */
export function taxiPickupZoneFor(
  zones: TaxiPickupZone[],
  point: { lat: number; lng: number },
): TaxiPickupZone | null {
  for (const z of zones) {
    const km = Math.hypot((point.lat - z.lat) * 111, (point.lng - z.lng) * 104);
    if (km <= z.radius_km) return z;
  }
  return null;
}

export interface TaxiQuote {
  distance_km: number;
  estimated_minutes: number;
  fare_amount: number;
  currency: string;
  night_surcharge: boolean;
  vehicle_class?: TaxiVehicleClass;
  vehicle_label?: string;
  seats?: number;
  trip_mode?: TaxiTripMode;
  hours?: number | null;
  breakdown?: TaxiFareBreakdown;
  /** Ruta por carretera codificada (Google); ausente = estimado en línea recta. */
  road_polyline?: string | null;
  road_route?: boolean;
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
  vehicle_class?: TaxiVehicleClass;
  approved: boolean;
  is_available: boolean;
  last_location_lat: number | null;
  last_location_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
}

export interface TaxiRide {
  traveler_rating?: number | null;
  traveler_comment?: string | null;
  driver_rating?: number | null;
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
  vehicle_class?: TaxiVehicleClass;
  trip_mode?: TaxiTripMode;
  hours?: number | null;
  stops?: TaxiStop[];
  fare_breakdown?: TaxiFareBreakdown | null;
  wait_charge_cents?: number;
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
  | "vehicle_class"
  | "trip_mode"
  | "hours"
  | "stops"
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
  vehicle_class?: TaxiVehicleClass;
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
  vehicle_color?: string | null;
  vehicle_number?: string | null;
  phone?: string | null;
  rating_avg?: number | null;
  rating_count?: number;
  completed_rides?: number;
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
    drivers_by_class: normalizeDriversByClass(raw && typeof raw === "object" ? (raw as Record<string, unknown>).drivers_by_class : null),
    fleet: normalizeTaxiFleet(raw && typeof raw === "object" ? (raw as Record<string, unknown>).fleet : null),
    pickup_zones: normalizeZones(raw && typeof raw === "object" ? (raw as Record<string, unknown>).pickup_zones : null),
  };
}

function normalizeDriversByClass(raw: unknown): Partial<Record<TaxiVehicleClass, number>> {
  const out: Partial<Record<TaxiVehicleClass, number>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of TAXI_VEHICLE_CLASSES) {
    const n = (raw as Record<string, unknown>)[k];
    if (typeof n === "number" && n > 0) out[k] = n;
  }
  return out;
}

function normalizeZones(raw: unknown): TaxiPickupZone[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((z) => {
    const v = z as Record<string, unknown>;
    return typeof v["slug"] === "string" && typeof v["lat"] === "number" && typeof v["lng"] === "number"
      ? [{ slug: v["slug"], name: String(v["name"] ?? v["slug"]), lat: v["lat"], lng: v["lng"], radius_km: Number(v["radius_km"] ?? 30) }]
      : [];
  });
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
  if (message.includes("pickup_outside_zone")) return "Por ahora Taxi Alux sólo recoge en los destinos de salida activos.";
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
  if (message.includes("vehicle_too_small")) return "Son más personas de las que caben en ese vehículo. Elige uno más grande.";
  if (message.includes("hours_too_short")) return "El recorrido de ida y vuelta tarda más que las horas elegidas. Agrega más horas.";
  if (message.includes("invalid_hours")) return "Elige un número de horas permitido para el viaje redondo.";
  if (message.includes("too_many_stops")) return "Agregaste más paradas de las permitidas.";
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
  const esc = (v: string | number) => {
    const text = String(v);
    // Quoting CSV does not stop Excel from evaluating a formula.
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)
      ? `'${text}`
      : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = entries.map((e) =>
    [e.paid_at, e.folio, e.driver_name, e.vehicle, e.traveler_name, e.traveler_phone, e.route, e.distance_km, (e.amount / 100).toFixed(2), e.currency, e.method].map(esc).join(","),
  );
  return [head.map(esc).join(","), ...rows].join("\n");
}

/** Minutos aproximados para que el taxi llegue (o termine), a 30 km/h en línea recta ×1.3. */
export function taxiEtaMinutes(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number },
): number | null {
  if (!from) return null;
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a)) * 1.3;
  return Math.max(1, Math.round((km / 30) * 60));
}

/** Texto principal tipo «Tu taxi llega en 4 min» según el estado del viaje. */
export function taxiEtaHeadline(status: TaxiRideStatus, eta: number | null): string {
  if (status === "requested") return "Buscando un taxista para ti";
  if (status === "accepted") return eta != null ? `Tu taxi llega en ${eta} min` : "Tu taxi va en camino";
  if (status === "arrived") return "Tu taxi ya llegó";
  if (status === "in_progress") return eta != null ? `Llegas a tu destino en ${eta} min` : "Vas en camino a tu destino";
  if (status === "completed") return "Llegaste a tu destino";
  return "Viaje cancelado";
}

export function taxiTripLabel(ride: { trip_mode?: TaxiTripMode; hours?: number | null; vehicle_class?: TaxiVehicleClass; stops?: TaxiStop[] }): string {
  const parts: string[] = [];
  if (ride.vehicle_class) parts.push(ride.vehicle_class[0]!.toUpperCase() + ride.vehicle_class.slice(1));
  parts.push(ride.trip_mode === "hourly" ? `Ida y vuelta · ${ride.hours ?? 0} h` : "Sólo ida");
  const stops = ride.stops?.length ?? 0;
  if (stops) parts.push(`${stops} ${stops === 1 ? "parada" : "paradas"}`);
  return parts.join(" · ");
}

/** Decodifica una polilínea de Google en puntos para dibujar la ruta del taxi. */
export function decodeTaxiPolyline(encoded: string | null | undefined): Array<{ lat: number; lng: number }> {
  if (!encoded) return [];
  const out: Array<{ lat: number; lng: number }> = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}
