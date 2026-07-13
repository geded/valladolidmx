/**
 * Límites duros del contrato AnonymousTravelDraft v1.0.0.
 * Alcanzar un límite NO se comunica como error técnico; el copy oficial vive
 * en `copy.ts` y se orienta a beneficio ("guarda tu viaje para seguir
 * agregando…"). Este módulo sólo expone los números.
 */
export const ANON_LIMITS = {
  favorites: 25,
  plannedItems: 40,
  destinationIds: 8,
  payloadBytes: 64 * 1024,
  noteChars: 280,
  writeDebounceMs: 400,
} as const;

export type LimitKey = keyof typeof ANON_LIMITS;

export function isAtLimit(key: LimitKey, currentCount: number): boolean {
  const cap = ANON_LIMITS[key];
  return typeof cap === "number" && currentCount >= cap;
}
