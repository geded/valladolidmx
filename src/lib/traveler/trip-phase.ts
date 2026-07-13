/**
 * Trip Phase — helper único y canónico de la fase macro del viaje.
 *
 * Fuente única consumida por Mi Viaje, Alux, Concierge, Discovery,
 * notificaciones y futuras capacidades Live Destination Companion.
 *
 * Reglas vinculantes (Founder Travel Companion Principle):
 *  - La fase se CALCULA, no se persiste.
 *  - Sólo hay 4 fases macro. Otros conceptos (countdown T-14/T-3, viaje
 *    cerrado post-14d, etc.) son derivados locales, no reemplazan este tipo.
 *  - Firma oficial: deriveTripPhase(plan, confirmed).
 *
 * Ver docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md (H-4.1) y
 * mem://policies/founder-travel-companion.md.
 */

export type TripPhase = "planning" | "confirmed" | "onsite" | "post";

/** Forma mínima requerida del Travel Plan para derivar la fase. */
export interface TripPhasePlanInput {
  id?: string | null;
  items_count?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

/** Forma mínima requerida de la orden confirmada para derivar la fase. */
export interface TripPhaseConfirmedInput {
  days_to_trip: number | null;
  plan_end_date: string | null;
}

/**
 * Deriva la fase macro del viaje a partir del plan activo y la orden
 * confirmada. Contrato oficial acordado en CV5 · Validation Report v1.0.
 *
 * Lógica:
 *  - Sin orden confirmada  → "planning" (incluye plan vacío o poblado).
 *  - Confirmada, faltan días → "confirmed".
 *  - Hoy dentro del rango [start, end] → "onsite".
 *  - Hoy > end_date → "post".
 *
 * El parámetro `plan` queda disponible en la firma para futuras
 * variantes (p. ej. distinguir "planning vacío" vs "planning con plan"
 * cuando el producto lo requiera) sin cambiar consumidores.
 */
export function deriveTripPhase(
  _plan: TripPhasePlanInput | null | undefined,
  confirmed: TripPhaseConfirmedInput | null | undefined,
): TripPhase {
  if (!confirmed) return "planning";
  const d = confirmed.days_to_trip;
  if (typeof d === "number" && d > 0) return "confirmed";
  if (confirmed.plan_end_date) {
    const end = new Date(`${confirmed.plan_end_date}T23:59:59Z`).getTime();
    if (Date.now() <= end) return "onsite";
    return "post";
  }
  return typeof d === "number" && d === 0 ? "onsite" : "confirmed";
}

/** Etiqueta legible por defecto (ES). Consumidores pueden i18n-izar. */
export const TRIP_PHASE_LABEL_ES: Record<TripPhase, string> = {
  planning: "Planeando",
  confirmed: "Viaje confirmado",
  onsite: "En viaje",
  post: "Después del viaje",
};