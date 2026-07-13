/**
 * CV6.7 · On-Trip Concierge Priority — Pure Domain.
 *
 * Primera capa del **Travel Assistance Layer** (política registrada en
 * `mem://policies/travel-assistance-layer.md`).
 *
 * Reglas vinculantes:
 *  1. Single Entry Point — todo acceso a asistencia durante el viaje
 *     nace de este contrato.
 *  2. Pure Domain — sin efectos secundarios, determinista, testeable.
 *  3. Stateless UI — el consumidor sólo renderiza `OnTripConciergeState`.
 *  4. Strict Reuse — LiveDayContext + promotePlanToCase + concierge_orders +
 *     CV6.1–CV6.6. Prohibido consumir CMS/Contributors/APIs externas.
 *  5. Explainable by Default — `rationale`, `slaLabel`, `conciergeStatus`,
 *     `ctaOutcome`, `reversible`, `explain{sources,rules}`.
 *  6. Evolution without Refactoring — `AssistanceChannel` declara TODAS
 *     las capacidades futuras (chat/voz/llamada/WhatsApp/SOS/incidencias/
 *     IA colaborativa/automatización/seguimiento). Sólo `concierge` activo.
 */

import type { LiveDayContext } from "@/lib/traveler/live-day";
import type { TripPhase } from "@/lib/traveler/trip-phase";

export type AssistanceState =
  | "hidden"
  | "standby"
  | "case_open"
  | "sla_breach"
  | "sos";

/**
 * Contrato extensible de capacidades. TODAS declaradas para permitir
 * evolución sin refactor; CV6.7 sólo habilita `concierge` en
 * `activeChannels`.
 */
export type AssistanceChannel =
  | "concierge"
  | "chat"
  | "voice"
  | "call"
  | "whatsapp"
  | "sos"
  | "incident"
  | "ai_collab"
  | "automation"
  | "case_tracking";

export interface OnTripConciergeState {
  state: AssistanceState;
  visible: boolean;
  headline: string;
  rationale: string;
  slaLabel: string;
  conciergeStatus: string;
  ctaLabel: string;
  ctaIntent: "open_case" | "view_case" | "escalate" | "none";
  ctaOutcome: string;
  reversible: boolean;
  /** Todas las capacidades declaradas por la capa (para evolución). */
  channels: AssistanceChannel[];
  /** Capacidades habilitadas HOY (CV6.7 → sólo `concierge`). */
  activeChannels: AssistanceChannel[];
  explain: { sources: string[]; rules: string[] };
}

export interface OnTripConciergeInput {
  phase: TripPhase;
  liveDay: LiveDayContext;
  /** Caso vigente vinculado al plan (`travel_plans.case_id` + `cc_cases`). */
  case?: { id: string; status?: string | null } | null;
  /** Orden confirmada del viaje (`concierge_orders`). */
  order?: { status: string } | null;
  at: Date;
  /** Horario laboral del Concierge (default 8..22 hora local del destino). */
  officeHours?: { openHour: number; closeHour: number };
}

const DECLARED_CHANNELS: AssistanceChannel[] = [
  "concierge",
  "chat",
  "voice",
  "call",
  "whatsapp",
  "sos",
  "incident",
  "ai_collab",
  "automation",
  "case_tracking",
];
const ACTIVE_CHANNELS_V1: AssistanceChannel[] = ["concierge"];

const HIDDEN: OnTripConciergeState = {
  state: "hidden",
  visible: false,
  headline: "",
  rationale: "",
  slaLabel: "",
  conciergeStatus: "",
  ctaLabel: "",
  ctaIntent: "none",
  ctaOutcome: "",
  reversible: true,
  channels: DECLARED_CHANNELS,
  activeChannels: ACTIVE_CHANNELS_V1,
  explain: { sources: [], rules: [] },
};

function withinOfficeHours(
  at: Date,
  hours: { openHour: number; closeHour: number },
): boolean {
  // America/Merida ≈ UTC-6 (sin DST). Determinista y suficiente para CV6.7.
  const localHour = (at.getUTCHours() - 6 + 24) % 24;
  return localHour >= hours.openHour && localHour < hours.closeHour;
}

/**
 * Pure derivador oficial. TODA decisión visual del banner debe originarse
 * aquí. La UI no toma decisiones.
 */
export function deriveOnTripConciergeState(
  input: OnTripConciergeInput,
): OnTripConciergeState {
  const officeHours = input.officeHours ?? { openHour: 8, closeHour: 22 };
  const rules: string[] = [];
  const sources: string[] = ["live_day", "travel_plan_contract"];

  // Auto-Hide · fuera de onsite no aplica la capa.
  if (input.phase !== "onsite") {
    rules.push("phase!=onsite");
    return { ...HIDDEN, explain: { sources, rules } };
  }

  // Auto-Hide · sin plan/day → no hay decisión útil (Founder Experience First).
  if (input.liveDay.day == null) {
    rules.push("no_active_day");
    return { ...HIDDEN, explain: { sources, rules } };
  }

  const inHours = withinOfficeHours(input.at, officeHours);
  const hoursLabel = inHours
    ? "Concierge disponible (horario laboral)"
    : "Fuera de horario · respuesta al siguiente turno";
  const slaLabel = inHours ? "Respuesta < 30 min" : "Respuesta en horario laboral";

  // Caso abierto → prioridad máxima.
  if (input.case?.id) {
    sources.push("cc_cases");
    rules.push("case_open");
    return {
      state: "case_open",
      visible: true,
      headline: "Tu Concierge está contigo",
      rationale:
        "Tienes un expediente activo vinculado a tu viaje. Consulta el estado o añade una petición.",
      slaLabel,
      conciergeStatus: hoursLabel,
      ctaLabel: "Ver expediente",
      ctaIntent: "view_case",
      ctaOutcome:
        "Abrirá tu expediente actual del Concierge sin crear uno nuevo.",
      reversible: true,
      channels: DECLARED_CHANNELS,
      activeChannels: ACTIVE_CHANNELS_V1,
      explain: { sources, rules },
    };
  }

  // Sin caso · con viaje confirmado → standby (acceso prioritario).
  const confirmedStatuses = new Set(["paid", "fulfilled", "confirmed"]);
  if (input.order && confirmedStatuses.has(input.order.status)) {
    sources.push("concierge_orders");
    rules.push("trip_confirmed_no_case");
    return {
      state: "standby",
      visible: true,
      headline: "¿Necesitas ayuda ahora?",
      rationale:
        "Estás en destino con un viaje confirmado. Puedes activar tu Concierge en un toque.",
      slaLabel,
      conciergeStatus: hoursLabel,
      ctaLabel: "Contactar Concierge",
      ctaIntent: "open_case",
      ctaOutcome:
        "Abrirá un expediente vinculado a tu plan y notificará al Concierge asignado.",
      reversible: true,
      channels: DECLARED_CHANNELS,
      activeChannels: ACTIVE_CHANNELS_V1,
      explain: { sources, rules },
    };
  }

  // Sin caso y sin orden confirmada → no aportamos valor real.
  rules.push("no_case_no_confirmed_order");
  return { ...HIDDEN, explain: { sources, rules } };
}