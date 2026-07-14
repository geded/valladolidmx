/**
 * CV8.S.3 · Contratos compartidos por los sub-motores (Capa 2: Generación).
 *
 * Cada sub-motor recibe un `SubMotorContext` con el sujeto, la etapa
 * alcanzada, el destino activo, el cursor temporal, el PRNG y el envelope
 * de simulación. Devuelve `SimulatedEvent[]` (siempre causales) y un
 * `outcome` interpretable por el sub-motor siguiente (Concierge →
 * Commerce → Reviews).
 *
 * Founder Ecosystem Interaction Principle:
 *  - Toda emisión debe declarar `rationale` y `causality.prerequisite`
 *    apuntando a un evento previo real de la traza.
 *  - Prohibido emitir sin prerequisito del Journey.
 */
import type { VisitorEvent } from "../../events";
import type { DestinationSlug } from "../paths";
import type { ProfileDefinition } from "../profiles";
import type { Prng } from "../prng";
import type { SimulationScenario } from "../scenario";
import type { SimulatedEvent } from "../behavior";

export interface SubMotorContext {
  runId: string;
  subject_id: string;
  locale: string;
  profile: ProfileDefinition;
  destination: DestinationSlug;
  scenario: SimulationScenario;
  prng: Prng;
  /** Cursor temporal (ms epoch) — cada sub-motor lo avanza y devuelve. */
  cursor_ms: number;
  /** Identificador de la transición previa (T3..T9). */
  from_transition: string;
  /** trust_level actual del sujeto. */
  trust_level: VisitorEvent["subject"]["trust_level"];
  /** true si el sujeto ya está autenticado. */
  is_authenticated: boolean;
}

export interface SubMotorResult {
  events: SimulatedEvent[];
  cursor_ms: number;
}

/** Outcome del sub-motor Alux consumible por el resto. */
export interface AluxOutcome extends SubMotorResult {
  /** Recomendación aceptada más reciente (para prerequisito de Concierge/Commerce). */
  last_accepted_recommendation_id: string | null;
  interactions: {
    asks: number;
    recommendations: number;
    accepted: number;
    rejected: number;
    itinerary_optimizations: number;
    onsite_queries: number;
  };
  /** Ajuste multiplicativo (0.7..1.3) sobre la probabilidad de la siguiente transición. */
  probability_modifier: number;
}

/** Outcome del sub-motor Concierge. */
export interface ConciergeOutcome extends SubMotorResult {
  case_id: string | null;
  proposal_id: string | null;
  status:
    | "opened_pending_response"
    | "proposal_sent"
    | "proposal_accepted"
    | "proposal_rejected"
    | "abandoned"
    | "lost";
  sla_response_ms: number | null;
  slow_response: boolean;
}

/** Outcome del sub-motor Commerce. */
export interface CommerceOutcome extends SubMotorResult {
  order_id: string | null;
  status:
    | "not_created"
    | "payment_pending"
    | "paid"
    | "cancelled"
    | "expired"
    | "refunded";
  amount_usd: number | null;
}

/** Outcome del sub-motor Reviews. */
export interface ReviewsOutcome extends SubMotorResult {
  review_published: boolean;
  rating: number | null;
  business_responded: boolean;
  /** Ajuste multiplicativo sobre probabilidad de T9 (ambassador). */
  ambassador_modifier: number;
}