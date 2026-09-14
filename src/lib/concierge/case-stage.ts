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
  assigned_concierge_user_id: string | null;
  assigned_concierge_name: string | null;
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
    return {
      id: "accepted",
      label: "Propuesta aceptada",
      nextAction: "El viajero aceptó. Da seguimiento al cierre del viaje.",
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

export interface InboxDefinition {
  id: string;
  label: string;
  /** Scope que se pide a la operación oficial de listado. */
  scope: "concierge" | "unassigned" | "lead";
  /** Etapas que se muestran en esta bandeja; vacío = todas. */
  stages: CaseStageId[];
}

export const CONCIERGE_INBOXES: readonly InboxDefinition[] = [
  { id: "unassigned", label: "Sin asignar", scope: "unassigned", stages: [] },
  {
    id: "mine",
    label: "Mis expedientes",
    scope: "concierge",
    stages: [
      "unassigned",
      "intake",
      "awaiting_quotes",
      "ready_to_propose",
      "proposal_sent",
      "needs_rework",
    ],
  },
  {
    id: "awaiting_quotes",
    label: "Esperando cotización",
    scope: "lead",
    stages: ["awaiting_quotes"],
  },
  {
    id: "ready_to_propose",
    label: "Listos para proponer",
    scope: "lead",
    stages: ["ready_to_propose"],
  },
  { id: "sent", label: "Propuestas enviadas", scope: "lead", stages: ["proposal_sent"] },
  { id: "rework", label: "Requieren ajuste", scope: "lead", stages: ["needs_rework"] },
  { id: "accepted", label: "Aceptadas", scope: "lead", stages: ["accepted"] },
  { id: "closed", label: "Cerrados", scope: "lead", stages: ["closed"] },
  { id: "all", label: "Todo el equipo", scope: "lead", stages: [] },
] as const;

/** Referencia legible del expediente, igual que en el detalle. */
export function caseReference(id: string): string {
  return `Expediente ${id.slice(0, 8).toUpperCase()}`;
}
