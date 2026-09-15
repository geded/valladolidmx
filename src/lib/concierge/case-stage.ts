/**
 * Derivación de etapa de seguimiento del expediente Concierge.
 *
 * NO introduce estados nuevos: combina el estado oficial del expediente
 * (`concierge_cases.status`), las cotizaciones empresariales
 * (`concierge_quotes.status`) y la última propuesta del Concierge
 * (`concierge_proposals.status`) en una etapa legible y una acción siguiente.
 *
 * Ciclo oficial (14.60.x / 15.10.4):
 *  caso      new → triaged → in_progress ⇄ awaiting_traveler ⇄ awaiting_business
 *            → closed_won | closed_lost | archived
 *  cotización requested → submitted → accepted | rejected | withdrawn | expired
 *  propuesta  draft → sent → viewed → accepted | rejected | withdrawn
 *            | superseded | expired
 */

export type CaseStageId =
  | "unassigned"
  | "intake"
  | "awaiting_quotes"
  | "ready_to_propose"
  | "proposal_draft"
  | "proposal_sent"
  | "needs_rework"
  | "accepted"
  | "closed";

export interface CaseFollowUp {
  case_id: string;
  quotes_requested: number;
  quotes_submitted: number;
  quotes_other: number;
  latest_proposal_status: string | null;
  latest_proposal_sent_at: string | null;
  latest_proposal_total_cents?: number | null;
  latest_proposal_currency?: string | null;
  /** Reservación generada al aceptar la propuesta, si ya existe. */
  order_status?: string | null;
  order_paid_at?: string | null;
  assigned_concierge_user_id: string | null;
  assigned_concierge_name: string | null;
  /** Fechas reales del viaje (Travel Plan ligado al expediente). */
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  /** Momento de la última pregunta del viajero sin responder. */
  pending_question_since?: string | null;
}

export interface CaseStage {
  id: CaseStageId;
  label: string;
  /** Qué falta hacer ahora, en lenguaje del equipo. */
  nextAction: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
}

const CLOSED_STATUSES = new Set(["closed_lost", "archived"]);
const WON_STATUSES = new Set(["closed_won", "won", "resolved"]);
const REWORK_PROPOSALS = new Set(["rejected", "withdrawn", "superseded", "expired"]);
const ACCEPTED_PROPOSALS = new Set(["accepted"]);
const OPEN_PROPOSALS = new Set(["sent", "viewed"]);

export function deriveCaseStage(input: {
  status: string;
  assigned_concierge_user_id: string | null;
  followUp?: CaseFollowUp | null;
}): CaseStage {
  const f = input.followUp ?? null;
  const proposal = f?.latest_proposal_status ?? null;

  if (WON_STATUSES.has(input.status) || (proposal && ACCEPTED_PROPOSALS.has(proposal))) {
    const paid = f?.order_status === "paid" || f?.order_status === "fulfilled";
    const hasOrder = Boolean(f?.order_status);
    return {
      id: "accepted",
      label: paid ? "Viaje confirmado y pagado" : "Propuesta aceptada",
      nextAction: paid
        ? "Pagado. Da seguimiento al itinerario del viajero."
        : hasOrder
          ? "El viajero aceptó. Falta confirmar el pago de su reservación."
          : "El viajero aceptó. Falta que confirme su reservación y el pago.",
      tone: "success",
    };
  }

  if (CLOSED_STATUSES.has(input.status)) {
    return {
      id: "closed",
      label: input.status === "archived" ? "Archivado" : "Cerrado sin venta",
      nextAction: "Sin acciones pendientes.",
      tone: "neutral",
    };
  }

  if (proposal && REWORK_PROPOSALS.has(proposal)) {
    return {
      id: "needs_rework",
      label: "Requiere ajuste",
      nextAction:
        proposal === "rejected"
          ? "El viajero no aceptó. Ajusta y envía una nueva propuesta."
          : "La propuesta ya no está vigente. Prepara una nueva versión.",
      tone: "danger",
    };
  }

  if (proposal && OPEN_PROPOSALS.has(proposal)) {
    return {
      id: "proposal_sent",
      label: proposal === "viewed" ? "Propuesta vista" : "Propuesta enviada",
      nextAction:
        proposal === "viewed"
          ? "El viajero ya la abrió. Da seguimiento a su respuesta."
          : "Esperando que el viajero la abra y responda.",
      tone: "info",
    };
  }

  if (proposal === "draft") {
    return {
      id: "proposal_draft",
      label: "Propuesta en preparación",
      nextAction: "La propuesta está en borrador. Revísala y envíala al viajero.",
      tone: "warning",
    };
  }

  if (!input.assigned_concierge_user_id) {
    return {
      id: "unassigned",
      label: "Sin asignar",
      nextAction: "Nadie lo está atendiendo. Asígnalo cuanto antes.",
      tone: "warning",
    };
  }

  const submitted = f?.quotes_submitted ?? 0;
  const requested = f?.quotes_requested ?? 0;

  if (submitted > 0) {
    return {
      id: "ready_to_propose",
      label: "Listo para proponer",
      nextAction:
        requested > 0
          ? `${submitted} cotización(es) respondida(s) y ${requested} pendiente(s). Ya puedes armar la propuesta.`
          : `${submitted} cotización(es) respondida(s). Arma la propuesta económica.`,
      tone: "success",
    };
  }

  if (requested > 0) {
    return {
      id: "awaiting_quotes",
      label: "Esperando cotización",
      nextAction: `Esperando respuesta de ${requested} empresa(s).`,
      tone: "info",
    };
  }

  return {
    id: "intake",
    label: "En revisión",
    nextAction: "Revisa lo que pidió el viajero y solicita cotizaciones.",
    tone: "warning",
  };
}

/* ───────────── Ciclo de vida del viaje ─────────────
 * Segundo eje, derivado de la reservación (`concierge_orders`) y de las
 * fechas del Travel Plan. No introduce estados nuevos.
 */

export type TripPhaseId =
  | "selling"
  | "awaiting_payment"
  | "paid_upcoming"
  | "departing_soon"
  | "on_trip"
  | "returned"
  | "no_dates"
  | "closed";

export interface TripPhase {
  id: TripPhaseId;
  label: string;
  detail: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
}

const PAID_ORDER = new Set(["paid", "fulfilled"]);
const PENDING_ORDER = new Set(["pending", "cart", "confirmed"]);

/** Diferencia en días entre hoy (hora de Mérida) y una fecha ISO `YYYY-MM-DD`. */
export function daysFromToday(date: string, now: Date = new Date()): number {
  const today = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Merida" }),
  );
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86_400_000);
}

export function deriveTripPhase(input: {
  status: string;
  stage: CaseStage;
  followUp?: CaseFollowUp | null;
  now?: Date;
}): TripPhase {
  const f = input.followUp ?? null;
  const now = input.now ?? new Date();

  if (CLOSED_STATUSES.has(input.status)) {
    return {
      id: "closed",
      label: "Cerrado",
      detail: "Sin acciones pendientes.",
      tone: "neutral",
    };
  }

  const order = f?.order_status ?? null;
  const paid = order ? PAID_ORDER.has(order) : false;
  const start = f?.trip_start_date ?? null;
  const end = f?.trip_end_date ?? start;

  if (paid && start) {
    const toStart = daysFromToday(start, now);
    const toEnd = end ? daysFromToday(end, now) : toStart;
    if (toStart <= 0 && toEnd >= 0) {
      const dayNumber = 1 - toStart;
      const total = toEnd - toStart + 1;
      return {
        id: "on_trip",
        label: "En destino",
        detail: `Día ${dayNumber} de ${total} en el destino.`,
        tone: "success",
      };
    }
    if (toEnd < 0) {
      return { id: "returned", label: "Regresó", detail: "El viaje terminó.", tone: "neutral" };
    }
    if (toStart <= 7) {
      return {
        id: "departing_soon",
        label: "Viaja pronto",
        detail: toStart === 1 ? "Sale mañana." : `Sale en ${toStart} días.`,
        tone: "warning",
      };
    }
    return {
      id: "paid_upcoming",
      label: "Pagado · por viajar",
      detail: `Sale en ${toStart} días.`,
      tone: "info",
    };
  }

  if (paid) {
    return {
      id: "no_dates",
      label: "Pagado · sin fechas",
      detail: "Falta capturar las fechas del viaje.",
      tone: "warning",
    };
  }

  if (input.stage.id === "accepted" || (order && PENDING_ORDER.has(order))) {
    return {
      id: "awaiting_payment",
      label: "Por pagar",
      detail: "Reservación sin pago confirmado.",
      tone: "danger",
    };
  }

  return { id: "selling", label: "En venta", detail: input.stage.nextAction, tone: "info" };
}

export interface InboxDefinition {
  id: string;
  label: string;
  /** Agrupación visual de la bandeja. */
  group: "Venta" | "Pago" | "Viaje" | "Cierre";
  /** Scope que se pide a la operación oficial de listado. */
  scope: "concierge" | "unassigned" | "lead";
  /** Etapas que se muestran en esta bandeja; vacío = todas. */
  stages: CaseStageId[];
  /** Fases del viaje que se muestran; vacío = no filtra por fase. */
  phases?: TripPhaseId[];
  /** Sólo expedientes con una pregunta del viajero sin responder. */
  pendingQuestion?: boolean;
}

export const CONCIERGE_INBOXES: readonly InboxDefinition[] = [
  { id: "unassigned", label: "Sin asignar", group: "Venta", scope: "unassigned", stages: [] },
  {
    id: "mine",
    label: "Mis expedientes",
    group: "Venta",
    scope: "concierge",
    stages: [
      "unassigned",
      "intake",
      "awaiting_quotes",
      "ready_to_propose",
      "proposal_draft",
      "proposal_sent",
      "needs_rework",
    ],
  },
  {
    id: "questions",
    label: "Preguntas sin responder",
    group: "Venta",
    scope: "lead",
    stages: [],
    pendingQuestion: true,
  },
  {
    id: "awaiting_quotes",
    label: "Esperando cotización",
    group: "Venta",
    scope: "lead",
    stages: ["awaiting_quotes"],
  },
  {
    id: "ready_to_propose",
    label: "Listos para proponer",
    group: "Venta",
    scope: "lead",
    stages: ["ready_to_propose", "proposal_draft"],
  },
  {
    id: "sent",
    label: "Propuestas enviadas",
    group: "Venta",
    scope: "lead",
    stages: ["proposal_sent"],
  },
  {
    id: "rework",
    label: "Requieren ajuste",
    group: "Venta",
    scope: "lead",
    stages: ["needs_rework"],
  },
  {
    id: "awaiting_payment",
    label: "Por pagar",
    group: "Pago",
    scope: "lead",
    stages: [],
    phases: ["awaiting_payment"],
  },
  {
    id: "paid_upcoming",
    label: "Pagados · por viajar",
    group: "Viaje",
    scope: "lead",
    stages: [],
    phases: ["paid_upcoming"],
  },
  {
    id: "departing_soon",
    label: "Viaja esta semana",
    group: "Viaje",
    scope: "lead",
    stages: [],
    phases: ["departing_soon"],
  },
  {
    id: "on_trip",
    label: "En destino",
    group: "Viaje",
    scope: "lead",
    stages: [],
    phases: ["on_trip"],
  },
  {
    id: "no_dates",
    label: "Sin fechas de viaje",
    group: "Viaje",
    scope: "lead",
    stages: [],
    phases: ["no_dates"],
  },
  {
    id: "returned",
    label: "Regresaron",
    group: "Cierre",
    scope: "lead",
    stages: [],
    phases: ["returned"],
  },
  { id: "accepted", label: "Aceptadas", group: "Pago", scope: "lead", stages: ["accepted"] },
  { id: "closed", label: "Cerrados", group: "Cierre", scope: "lead", stages: ["closed"] },
  { id: "all", label: "Todo el equipo", group: "Cierre", scope: "lead", stages: [] },
] as const;

/** Referencia legible del expediente, igual que en el detalle. */
export function caseReference(id: string): string {
  return `Expediente ${id.slice(0, 8).toUpperCase()}`;
}
