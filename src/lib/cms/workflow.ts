/**
 * cms/workflow.ts — Máquina oficial de workflow editorial (Ola 1 · Etapa 6).
 *
 * Fuente única de verdad de las transiciones permitidas Serie 14:
 *   draft → in_review → approved → published → archived
 *            ↘ draft        ↘ draft       ↘ draft
 *
 * Hardening: centralizar la matriz elimina la posibilidad de divergencia
 * entre `writes.functions.ts` (entidades editables) y
 * `moderation.functions.ts` (reseñas). Cualquier cambio futuro a la máquina
 * debe modificarse en ESTE archivo y en ningún otro.
 */

export type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export const ALLOWED_TRANSITIONS: Readonly<
  Record<ContentStatus, readonly ContentStatus[]>
> = Object.freeze({
  draft: ["in_review", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["archived", "draft"],
  archived: ["draft"],
}) as Readonly<Record<ContentStatus, readonly ContentStatus[]>>;

export function isAllowedTransition(
  from: ContentStatus,
  to: ContentStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function assertAllowedTransition(
  from: ContentStatus,
  to: ContentStatus,
): void {
  if (!isAllowedTransition(from, to)) {
    throw new Error(`invalid_transition:${from}->${to}`);
  }
}
