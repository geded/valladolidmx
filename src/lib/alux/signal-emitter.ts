/**
 * G8-R1-E-R1 · Emisor único de señales de Alux (Addendum DEF-R1E-001/004).
 *
 * Un solo punto de emisión para toda la plataforma. Efectos:
 *  1. Registra la señal en la memoria funcional local (`memory-store`).
 *  2. Publica el evento seudónimo por la autoridad de escritura EXISTENTE
 *     (`ingestVisitorEvent` / `ingestAnonymousVisitorEvent`, server-side).
 *
 * Guardas:
 *  · Personalización pausada ⇒ no registra ni publica.
 *  · Deduplicación por (kind|key) dentro de una ventana corta.
 *  · Rate limit local por minuto (defensa en profundidad; el servidor
 *    conserva su propia validación e idempotencia por `event_id`).
 *  · Cero PII: la clave siempre es un slug/id canónico.
 *  · Fallo de red ⇒ silencioso; la señal local ya quedó registrada.
 */
import type { AluxSignalKind, AluxSignalPurpose } from "./behavior-signals";
import { isAllowedSignal } from "./behavior-signals";
import { readAluxMemory, ensureAluxMemory, recordAluxSignal } from "./memory-store";
import { toVisitorEvent, type AluxSignalEventContext } from "./signal-events";

export const ALUX_SIGNAL_DEDUPE_MS = 60_000;
export const ALUX_SIGNAL_RATE_LIMIT_PER_MIN = 30;

const lastEmitted = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

export interface EmitAluxSignalInput {
  readonly kind: AluxSignalKind;
  readonly key: string;
  readonly purpose?: AluxSignalPurpose;
  readonly context: Omit<AluxSignalEventContext, "subjectId" | "personalizationState">;
  readonly now?: number;
}

export type EmitAluxSignalResult =
  | { readonly emitted: true; readonly published: boolean }
  | { readonly emitted: false; readonly reason: "paused" | "invalid" | "duplicate" | "rate_limited" | "ssr" };

function withinRateLimit(now: number): boolean {
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= ALUX_SIGNAL_RATE_LIMIT_PER_MIN) return false;
  windowCount += 1;
  return true;
}

/** Pura: decide si la señal debe emitirse. Expuesta para el gate. */
export function shouldEmit(
  input: { kind: string; key: string; now: number },
  state: { paused: boolean; lastAt?: number },
): { ok: boolean; reason?: "paused" | "duplicate" } {
  if (state.paused) return { ok: false, reason: "paused" };
  if (typeof state.lastAt === "number" && input.now - state.lastAt < ALUX_SIGNAL_DEDUPE_MS) {
    return { ok: false, reason: "duplicate" };
  }
  return { ok: true };
}

export async function emitAluxSignal(input: EmitAluxSignalInput): Promise<EmitAluxSignalResult> {
  if (typeof window === "undefined") return { emitted: false, reason: "ssr" };
  const now = input.now ?? Date.now();
  const signal = {
    kind: input.kind,
    key: input.key.trim().toLowerCase(),
    at: now,
    purpose: input.purpose ?? ("personalization" as const),
  };
  if (!isAllowedSignal(signal)) return { emitted: false, reason: "invalid" };

  const memory = ensureAluxMemory(now);
  const dedupeKey = `${signal.kind}|${signal.key}`;
  const decision = shouldEmit(
    { kind: signal.kind, key: signal.key, now },
    { paused: memory.personalization === "paused", lastAt: lastEmitted.get(dedupeKey) },
  );
  if (!decision.ok) return { emitted: false, reason: decision.reason ?? "invalid" };
  if (!withinRateLimit(now)) return { emitted: false, reason: "rate_limited" };

  lastEmitted.set(dedupeKey, now);
  recordAluxSignal(signal, now);

  const event = toVisitorEvent(signal, {
    ...input.context,
    subjectId: memory.subjectId,
    personalizationState: memory.personalization,
  });
  if (!event) return { emitted: true, published: false };

  try {
    const mod = await import("@/lib/visitor-intel/ingest.functions");
    const fn = input.context.isAuthenticated
      ? mod.ingestVisitorEvent
      : mod.ingestAnonymousVisitorEvent;
    const result = await fn({ data: { event } });
    return { emitted: true, published: Boolean(result?.accepted) };
  } catch {
    return { emitted: true, published: false };
  }
}

/** Estado actual de personalización (para superficies y sondas). */
export function isPersonalizationPaused(now = Date.now()): boolean {
  return readAluxMemory(now).personalization === "paused";
}

/** Sólo para pruebas: reinicia dedupe y rate limit del proceso. */
export function __resetSignalEmitterState(): void {
  lastEmitted.clear();
  windowStart = 0;
  windowCount = 0;
}
