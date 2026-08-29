/**
 * G8-R1-E-R1 · Fase 4 — Traducción PURA de señal de comportamiento a evento
 * seudónimo del contrato congelado `visitor_intel` (CV8.0).
 *
 * NO crea un historial paralelo ni un segundo canal de escritura: sólo
 * convierte una señal ya validada por `behavior-signals.ts` en el evento
 * canónico que las server fns existentes (`ingestVisitorEvent` /
 * `ingestAnonymousVisitorEvent`) saben escribir.
 *
 * Allowlist estricta de campos. Prohibido: PII, tokens, roles, texto del
 * chat, ubicación precisa, teclas, movimientos o grabaciones.
 */
import type { AluxBehaviorSignal, AluxSignalKind } from "./behavior-signals";
import type { VisitorEvent } from "@/lib/visitor-intel/events";
import { VISITOR_EVENT_SCHEMA_VERSION } from "@/lib/visitor-intel/events";

export const ALUX_SIGNAL_EVENT_CONTRACT_VERSION = "1.0.0" as const;

/** Acción declarada en el evento por cada señal permitida. */
export const SIGNAL_ACTION: Readonly<Record<AluxSignalKind, string>> = {
  entity_viewed: "entity_viewed",
  territory_viewed: "territory_viewed",
  category_explored: "category_explored",
  saved: "favorite",
  plan_added: "add_to_plan",
  plan_removed: "remove_from_plan",
  suggestion_accepted: "recommendation_accepted",
  suggestion_rejected: "recommendation_rejected",
};

export interface AluxSignalEventContext {
  /** Id seudónimo aleatorio del navegador o del viajero autenticado. */
  readonly subjectId: string;
  readonly isAuthenticated: boolean;
  readonly locale?: string | null;
  readonly surface: string;
  readonly route: string;
  readonly destinationId?: string | null;
  readonly travelStage?:
    | "inspiration"
    | "exploration"
    | "planning"
    | "pre_trip"
    | "on_trip"
    | "post_trip"
    | null;
  /** Tipo de entidad canónica asociada (nunca texto libre del usuario). */
  readonly targetType?: string | null;
  /** Origen de la recomendación (algoritmo/superficie). */
  readonly recommendationSource?: string | null;
  /** Versión del algoritmo de personalización. */
  readonly algorithmVersion?: string | null;
  /** `paused` cuando el viajero pausó la personalización. */
  readonly personalizationState?: "active" | "paused";
  readonly eventId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function eventId(explicit: string | undefined): string {
  if (explicit && UUID_RE.test(explicit)) return explicit;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rnd = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  return `${rnd()}-${rnd().slice(0, 4)}-4${rnd().slice(0, 3)}-a${rnd().slice(0, 3)}-${rnd()}${rnd().slice(0, 4)}`;
}

/**
 * Traduce señal + contexto en evento canónico. Devuelve `null` cuando el
 * contexto es insuficiente (fail-closed) o la personalización está pausada.
 */
export function toVisitorEvent(
  signal: AluxBehaviorSignal,
  ctx: AluxSignalEventContext,
): VisitorEvent | null {
  if (!ctx.subjectId || !ctx.surface || !ctx.route) return null;
  if (ctx.personalizationState === "paused") return null;
  const action = SIGNAL_ACTION[signal.kind];
  if (!action) return null;

  const base = {
    event_id: eventId(ctx.eventId),
    occurred_at: new Date(signal.at).toISOString(),
    schema_version: VISITOR_EVENT_SCHEMA_VERSION,
    subject: {
      subject_id: ctx.subjectId,
      trust_level: ctx.isAuthenticated ? ("N2_personalization" as const) : ("N0_anonymous" as const),
      is_authenticated: ctx.isAuthenticated,
      ...(ctx.locale ? { locale: ctx.locale } : {}),
    },
    context: {
      destination_id: ctx.destinationId ?? null,
      surface: ctx.surface,
      route: ctx.route,
      ...(ctx.travelStage ? { travel_stage: ctx.travelStage } : {}),
    },
  };

  if (signal.kind === "suggestion_accepted" || signal.kind === "suggestion_rejected") {
    return {
      ...base,
      kind: "decision.offered",
      decision: {
        capability: ctx.recommendationSource ?? "alux",
        recommendation_id: signal.key,
        rationale: ctx.algorithmVersion ? `alux@${ctx.algorithmVersion}` : undefined,
        accepted: signal.kind === "suggestion_accepted",
      },
    } as VisitorEvent;
  }

  return {
    ...base,
    kind: "intent.signal",
    intent: {
      action,
      target_type: ctx.targetType ?? "unknown",
      target_id: signal.key,
      strength: signal.kind === "saved" || signal.kind === "plan_added" ? 0.8 : 0.4,
    },
  } as VisitorEvent;
}
