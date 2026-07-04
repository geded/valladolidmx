/**
 * Context Engine — Persistencia del recorrido inmediato anterior
 * (H-02 · I1).
 *
 * SSR-safe: todos los accesos a `window`/`sessionStorage` están
 * guardados. En servidor devuelve `undefined` y no persiste nada.
 *
 * TTL corto (5 min) — el contexto previo describe un salto inmediato,
 * no una sesión larga. La clave está namespaced por origen para
 * evitar colisiones cross-app en el mismo `sessionStorage`.
 */
import type { ContextNode, PreviousContext } from "./types";

const STORAGE_KEY = "vll:ctx-engine:previous:v1";
const TTL_MS = 5 * 60_000;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

interface StoredPrevious {
  readonly from: ContextNode;
  readonly ancestors: readonly ContextNode[];
  readonly at: number;
}

export function readPreviousContext(): PreviousContext | undefined {
  if (!hasWindow()) return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredPrevious;
    if (!parsed || typeof parsed.at !== "number") return undefined;
    if (Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function writePreviousContext(
  from: ContextNode,
  ancestors: readonly ContextNode[],
): void {
  if (!hasWindow()) return;
  try {
    const payload: StoredPrevious = { from, ancestors, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage lleno / bloqueado → ignorar silenciosamente
  }
}

export function clearPreviousContext(): void {
  if (!hasWindow()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}