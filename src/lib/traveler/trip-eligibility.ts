/**
 * TP1.1 · Política central de elegibilidad e identidad canónica para
 * "Agregar a Mi Viaje".
 *
 * Fuente única de verdad — cualquier superficie que quiera renderizar la
 * acción DEBE consultarla aquí. No hay condicionales dispersos por
 * componente. Preserva compatibilidad hacia atrás: `destination` mantiene
 * su comportamiento legacy (integrado hoy en `DestinoCard` y
 * `SmartDestinationsGrid`); `region` y `promotion` son explícitamente NO
 * elegibles.
 *
 * Reglas Founder aplicadas:
 *  - Sin slug como fallback de identidad. Identidad = `kind + UUID`.
 *  - Sin arquitectura paralela: reutiliza `TravelItemKind` del contrato
 *    canónico `travel-plans.functions.ts`.
 *  - Snapshot mínimo requerido (título) valida además que el ítem sea
 *    presentable en Mi Viaje sin lookup adicional.
 */
import type { TravelItemKind } from "./travel-plans.functions";

/**
 * Kinds elegibles para universalización en TP1.4. `destination` se preserva
 * en modo legacy (opt-in de la superficie) — no se universaliza en esta
 * iniciativa. `region` y `promotion` quedan fuera por decisión Founder.
 */
export const TRIP_UNIVERSAL_KINDS = new Set<TravelItemKind>([
  "product",
  "business",
  "event",
]);

export const TRIP_LEGACY_KINDS = new Set<TravelItemKind>(["destination"]);

/** UUID v1–v5 (RFC 4122) — identidad canónica requerida. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export interface TripEligibilityInput {
  kind: TravelItemKind | string;
  targetId?: string | null;
  /** Título mínimo requerido por el snapshot inmutable. */
  title?: string | null;
  /**
   * `universal` — activa cobertura TP1.4 (`TourismCard`, listados).
   * `legacy` — permite el comportamiento previo (destinos ya integrados).
   * Por defecto `universal`.
   */
  mode?: "universal" | "legacy";
}

export type TripEligibilityReason =
  | "eligible"
  | "kind_not_universal"
  | "kind_not_supported"
  | "missing_canonical_id"
  | "missing_snapshot_title";

export interface TripEligibilityResult {
  eligible: boolean;
  reason: TripEligibilityReason;
  identity: { kind: TravelItemKind; targetId: string } | null;
}

/**
 * Decide si la acción "Agregar a Mi Viaje" debe renderizarse para una
 * entidad dada. NO consulta estado remoto ni de sesión — decisión pura.
 */
export function evaluateTripEligibility(
  input: TripEligibilityInput,
): TripEligibilityResult {
  const mode = input.mode ?? "universal";
  const kind = input.kind as TravelItemKind;
  const allowed =
    mode === "legacy"
      ? TRIP_UNIVERSAL_KINDS.has(kind) || TRIP_LEGACY_KINDS.has(kind)
      : TRIP_UNIVERSAL_KINDS.has(kind);

  if (!allowed) {
    const known =
      TRIP_UNIVERSAL_KINDS.has(kind) || TRIP_LEGACY_KINDS.has(kind);
    return {
      eligible: false,
      reason: known ? "kind_not_universal" : "kind_not_supported",
      identity: null,
    };
  }
  if (!isCanonicalId(input.targetId)) {
    return {
      eligible: false,
      reason: "missing_canonical_id",
      identity: null,
    };
  }
  const title = (input.title ?? "").trim();
  if (!title) {
    return {
      eligible: false,
      reason: "missing_snapshot_title",
      identity: { kind, targetId: input.targetId },
    };
  }
  return {
    eligible: true,
    reason: "eligible",
    identity: { kind, targetId: input.targetId },
  };
}

/** Azúcar booleano para uso directo en JSX. */
export function isTripEligible(input: TripEligibilityInput): boolean {
  return evaluateTripEligibility(input).eligible;
}