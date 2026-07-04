/**
 * Protected Actions — Contratos v1 (OLA H-01 · Épica 1 · Incremento I1)
 *
 * SERVICIO GENÉRICO para toda la plataforma. No está diseñado para un módulo
 * particular (Mi Viaje, Favoritos, Concierge son sólo los primeros
 * consumidores planeados en I3-I5). Cualquier acción que requiera identidad
 * o cualquier otra pre-condición debe poder envolverse aquí sin tocar el
 * núcleo.
 *
 * EXTENSIBILIDAD (diseño, no implementación v1):
 * La forma `ProtectedActionRequirements` está intencionadamente abierta
 * para futuras gates (rol, permiso, suscripción, verificación de empresa,
 * perfil de viajero completo). En v1 sólo `authenticated` está activo.
 * Añadir un nuevo gate NO obliga a cambiar consumidores existentes; sólo
 * significa que el evaluador (I2+) reconoce un campo adicional.
 *
 * Sin PII: nada aquí debe llevar email, nombre, teléfono ni payload de
 * negocio. `kind` y `actionId` son suficientes para diagnóstico.
 */

/** Identificador estable de la acción (namespace punteado, sin PII). */
export type ProtectedActionKind = string;

/** Requisitos declarativos que un consumidor puede pedir para su acción. */
export interface ProtectedActionRequirements {
  /** v1: única gate activa. Cuando true, requiere sesión Supabase válida. */
  authenticated?: boolean;
  /** Diseño futuro — evaluador NO implementado en v1. */
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  requiredSubscription?: string | string[];
  requiredProfileCompletion?: string[]; // e.g. ["display_name","country"]
  requiredBusinessVerification?: boolean;
  requiredTravelerProfile?: boolean;
  /** Escape hatch para futuras extensiones sin cambiar el tipo público. */
  custom?: Record<string, unknown>;
}

/** Modo del consumidor. Compatible con el patrón "queue" de `guest-queue`. */
export type ProtectedActionMode = "gate" | "queue";

/** Entrada persistida (sólo metadatos: id, kind, ts). NUNCA payload. */
export interface PendingActionRecord {
  id: string;
  kind: ProtectedActionKind;
  createdAt: number;
  expiresAt: number;
  /** Etiqueta de motivo por el que se abrió el gate. Sin PII. */
  reason?: string;
}

/**
 * Payload de acción en memoria (NO se persiste en sessionStorage por
 * seguridad — R4 del DFT). Si la pestaña se recarga, se pierde y el
 * ResumeRunner descarta la acción emitiendo `expired`.
 */
export interface PendingActionRuntime<TResult = unknown> {
  record: PendingActionRecord;
  requirements: ProtectedActionRequirements;
  execute: () => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (err: unknown) => void;
}

/** Eventos de observabilidad (sin PII). */
export type ProtectedActionEvent =
  | "protected_action.started"
  | "protected_action.gated"
  | "protected_action.auth_requested"
  | "protected_action.auth_completed"
  | "protected_action.resumed"
  | "protected_action.restored"
  | "protected_action.dismissed"
  | "protected_action.cancelled"
  | "protected_action.expired"
  | "protected_action.failed";

export interface ProtectedActionEventMeta {
  actionId: string;
  kind: ProtectedActionKind;
  ttlMs?: number;
  reason?: string;
  errorCode?: string;
}

/** Default TTL — 10 minutos (DFT §5). Documentado como limitación conocida. */
export const DEFAULT_ACTION_TTL_MS = 10 * 60 * 1000;

/** Clave de sessionStorage. Sólo metadatos, nunca payload. */
export const PROTECTED_ACTIONS_STORAGE_KEY = "protected_actions.pending.v1";

/** Canal BroadcastChannel para sync entre pestañas. */
export const PROTECTED_ACTIONS_CHANNEL = "protected_actions.v1";
