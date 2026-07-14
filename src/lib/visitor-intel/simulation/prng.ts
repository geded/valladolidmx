/**
 * CV8.S.1 · PRNG determinístico (Capa 1: Contratos).
 *
 * Founder Reproducible Simulation Principle: toda aleatoriedad de la
 * simulación pasa por este generador sembrado. Prohibido `Math.random`,
 * `Date.now()` o `crypto.randomUUID()` fuera de este módulo dentro de
 * `src/lib/visitor-intel/simulation/*`.
 *
 * Algoritmo: mulberry32 — 32-bit, rápido, suficientemente uniforme para
 * generación de escenarios turísticos. Reproducible byte-a-byte.
 */

export interface Prng {
  /** Float uniforme en [0, 1). */
  next(): number;
  /** Entero uniforme en [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Booleano con probabilidad `p` de true. */
  bool(p: number): boolean;
  /** Elemento aleatorio de un array (arroja si vacío). */
  pick<T>(items: readonly T[]): T;
  /** Elección ponderada (pesos > 0). */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T;
  /** UUID v4 derivado del PRNG (no usa `crypto.randomUUID`). */
  uuid(): string;
  /** ISO string derivado de un timestamp base + offset del PRNG. */
  timestamp(baseMs: number, jitterMs: number): string;
}

/**
 * Convierte una seed textual (ej. `oriente-maya-90d`, `0xVMX2026`) en un
 * uint32 determinístico usando xmur3.
 */
function seedFromString(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function createPrng(seed: string): Prng {
  let state = seedFromString(seed) || 1;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) throw new Error("prng.int: max < min");
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const bool = (p: number): boolean => next() < p;

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error("prng.pick: empty array");
    return items[int(0, items.length - 1)]!;
  };

  const weighted = <T>(entries: ReadonlyArray<readonly [T, number]>): T => {
    const total = entries.reduce((acc, [, w]) => acc + w, 0);
    if (total <= 0) throw new Error("prng.weighted: total weight must be > 0");
    let r = next() * total;
    for (const [item, w] of entries) {
      r -= w;
      if (r <= 0) return item;
    }
    return entries[entries.length - 1]![0];
  };

  const hex = (bytes: number): string => {
    let out = "";
    for (let i = 0; i < bytes; i += 1) {
      out += int(0, 255).toString(16).padStart(2, "0");
    }
    return out;
  };

  const uuid = (): string => {
    // v4 layout with deterministic bits from the PRNG.
    const a = hex(4);
    const b = hex(2);
    const c = (0x4000 | int(0, 0x0fff)).toString(16).padStart(4, "0"); // version 4
    const d = (0x8000 | int(0, 0x3fff)).toString(16).padStart(4, "0"); // variant 1
    const e = hex(6);
    return `${a}-${b}-${c}-${d}-${e}`;
  };

  const timestamp = (baseMs: number, jitterMs: number): string => {
    return new Date(baseMs + int(0, Math.max(0, jitterMs))).toISOString();
  };

  return { next, int, bool, pick, weighted, uuid, timestamp };
}

/** Deriva una seed hija estable a partir de una seed padre + namespace. */
export function deriveSeed(parent: string, namespace: string): string {
  return `${parent}::${namespace}`;
}