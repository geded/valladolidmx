/**
 * plan-limit-errors.ts — Ola 7 · Sub-ola 7.4.b
 *
 * Traduce errores `plan_limit_reached:<key>:<max>:<slug>` lanzados por
 * los server functions a mensajes en español listos para toast/alert.
 * Client-safe (sin importar módulos server).
 */
import { PLAN_LIMIT_LABELS, type PlanLimitKey } from "./plan-limits";

export interface ParsedPlanLimitError {
  key: PlanLimitKey;
  max: number;
  planSlug: string;
  label: string;
  message: string;
}

export function parsePlanLimitError(err: unknown): ParsedPlanLimitError | null {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = /plan_limit_reached:([a-z_]+):(\d+)(?::([a-z0-9_-]+))?/i.exec(raw);
  if (!m) return null;
  const key = m[1] as PlanLimitKey;
  const max = Number(m[2]);
  const label = PLAN_LIMIT_LABELS[key] ?? key;
  return {
    key,
    max,
    planSlug: m[3] ?? "básico",
    label,
    message: `Tu plan actual permite hasta ${max} ${label}. Actualiza tu paquete de visibilidad para agregar más.`,
  };
}

/**
 * Devuelve el mensaje humano si el error es de límite de plan, o `fallback`
 * en cualquier otro caso. Útil en `catch` de UIs.
 */
export function toPlanLimitMessage(err: unknown, fallback: string): string {
  const parsed = parsePlanLimitError(err);
  return parsed?.message ?? fallback;
}