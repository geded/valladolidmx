/**
 * CV8.0 · Journey Contracts — Event Schema v1.0.0 (congelado).
 *
 * Contrato append-only para señales del Visitor Journey. Este módulo NO
 * publica eventos ni instrumenta superficies; sólo define la forma canónica
 * que consumirán las sub-olas posteriores (CV8.1 Ingesta, CV8.2 Proyección).
 *
 * Todos los eventos son inmutables. Prohibido mutar registros; toda
 * corrección se realiza por evento correctivo posterior (append-only).
 */
import { z } from "zod";

import { DecisionEventPayloadSchema } from "./decisions";
import type { JourneyTransitionId, TrustLevel, VisitorStage } from "./journey";

export const VISITOR_EVENT_SCHEMA_VERSION = "1.0.0" as const;

/** Sujeto observado — persona, no sesión. */
export const VisitorSubjectSchema = z.object({
  /** Identificador estable del viajero (uuid). Puede ser anónimo local. */
  subject_id: z.string().min(1),
  /** Nivel de confianza actual (Progressive Trust). */
  trust_level: z.enum([
    "N0_anonymous",
    "N1_continuity",
    "N2_personalization",
    "N3_operational",
    "N4_transactional",
  ]),
  /** True si el sujeto está autenticado. */
  is_authenticated: z.boolean(),
  /** Locale activo del viajero (BCP-47). */
  locale: z.string().min(2).max(10).optional(),
});

/** Contexto operativo en el que ocurre el evento. */
export const VisitorContextSchema = z.object({
  destination_id: z.string().uuid().nullable().optional(),
  surface: z.string().min(1), // "home" | "listing:hotels" | "workspace:trip" | ...
  route: z.string().min(1),
  travel_stage: z
    .enum(["inspiration", "exploration", "planning", "pre_trip", "on_trip", "post_trip"])
    .optional(),
  /** Fase derivada del Live Day (si aplica). */
  live_day_phase: z.string().optional(),
});

/**
 * Evento base del Visitor Journey.
 * `kind` distingue el tipo (transición, señal de intención, decisión, etc.).
 */
export const VisitorEventBaseSchema = z.object({
  event_id: z.string().uuid(),
  occurred_at: z.string().datetime(), // ISO 8601 UTC
  schema_version: z.literal(VISITOR_EVENT_SCHEMA_VERSION),
  subject: VisitorSubjectSchema,
  context: VisitorContextSchema,
});

// ---------------------------------------------------------------------------
// Eventos canónicos del contrato v1.0.0
// ---------------------------------------------------------------------------

/** Transición del Journey — cambio de etapa observado. */
export const JourneyTransitionEventSchema = VisitorEventBaseSchema.extend({
  kind: z.literal("journey.transition"),
  transition: z.object({
    id: z.string(), // JourneyTransitionId
    from: z.string(), // VisitorStage
    to: z.string(), // VisitorStage
    /** Acción proximal que provocó la transición (ver AttributionSchema). */
    attributed_action: z.string().optional(),
    /** Capacidad(es) del sistema que influyeron. */
    influencing_capabilities: z.array(z.string()).default([]),
  }),
});

/** Señal de intención (fav/add/compare/share/…) — no siempre transiciona. */
export const IntentSignalEventSchema = VisitorEventBaseSchema.extend({
  kind: z.literal("intent.signal"),
  intent: z.object({
    action: z.string(), // "favorite" | "add_to_plan" | "compare" | "share" | ...
    target_type: z.string(), // "business" | "product" | "destination" | ...
    target_id: z.string().optional(),
    strength: z.number().min(0).max(1).default(0.5),
  }),
});

/** Decisión mostrada por Alux/Concierge/Decision Center + resultado. */
export const DecisionOfferedEventSchema = VisitorEventBaseSchema.extend({
  kind: z.literal("decision.offered"),
  decision: z.object({
    capability: z.string(), // "alux" | "concierge" | "decision_center" | ...
    recommendation_id: z.string(),
    rationale: z.string().optional(), // Explainable by Default
    accepted: z.boolean().nullable().optional(),
  }),
});

/** Resultado observado para viajero/ecosistema tras una intervención. */
export const OutcomeObservedEventSchema = VisitorEventBaseSchema.extend({
  kind: z.literal("outcome.observed"),
  outcome: z.object({
    /** Transición asociada (si aplica). */
    transition_id: z.string().optional(),
    /** Beneficio para el viajero (0..1). */
    traveler_value: z.number().min(0).max(1).optional(),
    /** Beneficio para el ecosistema turístico local (0..1). */
    ecosystem_value: z.number().min(0).max(1).optional(),
    /** Etiqueta interpretable. */
    label: z.string().optional(),
  }),
});

/**
 * CV8.6 · Recommendation lifecycle transition.
 *
 * Traza el ciclo de vida de una recomendación emitida por Visitor Intelligence:
 * detected → accepted → implemented → observed → validated | discarded.
 * Append-only (Founder Journey State). Sin persistencia adicional: el estado
 * actual se recomputa siempre desde el historial de estos eventos.
 */
export const RECOMMENDATION_LIFECYCLE_STATUSES = [
  "detected",
  "accepted",
  "implemented",
  "observed",
  "validated",
  "discarded",
] as const;
export type RecommendationLifecycleStatus = (typeof RECOMMENDATION_LIFECYCLE_STATUSES)[number];

export const RecommendationLifecycleSchema = z.object({
  /** Identificador estable de la recomendación (compartido a lo largo del ciclo). */
  recommendation_id: z.string().min(1),
  /** Métrica/KPI a la que apunta la recomendación (ver KPI_CATALOG). */
  metric_id: z.string().min(1),
  /** Transición canónica implicada (T1..T9) o "aggregate". */
  transition: z.string().min(1),
  /** Severidad original en el momento de la detección. */
  severity: z.enum(["opportunity", "attention", "critical", "informative"]),
  /** Estado alcanzado por este evento. */
  status: z.enum(RECOMMENDATION_LIFECYCLE_STATUSES),
  /** Actor humano/sistema responsable (rol admin, alux, concierge…). */
  actor: z.string().min(1),
  /** Nota narrativa opcional. */
  note: z.string().max(500).optional(),
  /** Evidencia observada tras la acción (sólo para observed/validated/discarded). */
  outcome: z
    .object({
      kpi_before: z.number(),
      kpi_after: z.number(),
      delta_relative: z.number(),
      transition_advanced: z.boolean(),
    })
    .optional(),
});
export type RecommendationLifecycle = z.infer<typeof RecommendationLifecycleSchema>;

export const RecommendationLifecycleEventSchema = VisitorEventBaseSchema.extend({
  kind: z.literal("recommendation.lifecycle"),
  /** Ausente = contrato legacy CV8.6; `decision` = payload CV8.9. */
  subtype: z.literal("decision").optional(),
  recommendation: RecommendationLifecycleSchema.optional(),
  payload: DecisionEventPayloadSchema.optional(),
}).superRefine((event, ctx) => {
  if (event.subtype === "decision") {
    if (!event.payload) {
      ctx.addIssue({
        code: "custom",
        path: ["payload"],
        message: "recommendation.lifecycle subtype=decision requiere payload CV8.9.",
      });
    }
    if (event.recommendation) {
      ctx.addIssue({
        code: "custom",
        path: ["recommendation"],
        message: "Un evento decision no duplica el payload legacy de recomendación.",
      });
    }
    return;
  }

  if (!event.recommendation) {
    ctx.addIssue({
      code: "custom",
      path: ["recommendation"],
      message: "El evento legacy CV8.6 requiere recommendation.",
    });
  }
  if (event.payload) {
    ctx.addIssue({
      code: "custom",
      path: ["payload"],
      message: "payload CV8.9 requiere subtype=decision.",
    });
  }
});

export const VisitorEventSchema = z.discriminatedUnion("kind", [
  JourneyTransitionEventSchema,
  IntentSignalEventSchema,
  DecisionOfferedEventSchema,
  OutcomeObservedEventSchema,
  RecommendationLifecycleEventSchema,
]);

export type VisitorEvent = z.infer<typeof VisitorEventSchema>;
export type JourneyTransitionEvent = z.infer<typeof JourneyTransitionEventSchema>;
export type IntentSignalEvent = z.infer<typeof IntentSignalEventSchema>;
export type DecisionOfferedEvent = z.infer<typeof DecisionOfferedEventSchema>;
export type OutcomeObservedEvent = z.infer<typeof OutcomeObservedEventSchema>;
export type RecommendationLifecycleEvent = z.infer<typeof RecommendationLifecycleEventSchema>;

/**
 * Helper de tipado — garantiza que las transiciones publicadas correspondan
 * a las 9 transiciones canónicas del Journey (T1..T9).
 */
export function isCanonicalTransition(id: string): id is JourneyTransitionId {
  return id.startsWith("T") && /_to_/.test(id);
}

/** Sujeto observado, tipo público. */
export type VisitorSubject = z.infer<typeof VisitorSubjectSchema> & {
  trust_level: TrustLevel;
};

/** Etapa reportada en un evento (equivale a `VisitorStage`). */
export type ReportedStage = VisitorStage;
