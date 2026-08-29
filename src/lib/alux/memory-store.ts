/**
 * G8-R1-E-R1 · Memoria funcional local de Alux (Fase 1 y Fase 5).
 *
 * NO crea una segunda identidad, ni un segundo perfil, ni un segundo motor.
 * Es el sustrato local-first (mismo navegador y dispositivo) donde viven:
 *   · un identificador seudónimo ALEATORIO del navegador (jamás huella);
 *   · el estado de personalización (activa | pausada);
 *   · las señales permitidas por `behavior-signals.ts` (lista CERRADA,
 *     caducables, sin PII).
 *
 * La composición del viaje, favoritos y Mi Viaje NO se duplican aquí: su
 * autoridad sigue siendo `AnonymousTravelDraft` (IndexedDB) y Travel Plan.
 *
 * Invariantes:
 *  · Cero PII (sin nombre, correo, teléfono, tokens, roles, ubicación).
 *  · TTL idéntico al de continuidad anónima acreditada (30 días).
 *  · Personalización pausada ⇒ no se registran señales nuevas ni se usan
 *    las anteriores para ordenar.
 *  · Borrar memoria elimina el registro completo, incluido el id seudónimo.
 *  · SSR-safe: en servidor todo devuelve el estado neutro.
 */
import {
  ALUX_SIGNAL_TTL_MS,
  EMPTY_SIGNAL_SUMMARY,
  pruneSignals,
  summarizeSignals,
  type AluxBehaviorSignal,
  type AluxSignalSummary,
} from "./behavior-signals";

export const ALUX_MEMORY_VERSION = "1.0.0" as const;
/** Caducidad acreditada: mismo contrato que la continuidad anónima. */
export const ALUX_MEMORY_TTL_MS = ALUX_SIGNAL_TTL_MS;
export const ALUX_MEMORY_MAX_SIGNALS = 200;

const STORAGE_KEY = "vmx.alux.memory.v1";

export type AluxPersonalizationState = "active" | "paused";

export interface AluxMemoryRecord {
  readonly version: typeof ALUX_MEMORY_VERSION;
  /** Identificador seudónimo aleatorio del navegador. Nunca derivado. */
  readonly subjectId: string;
  readonly personalization: AluxPersonalizationState;
  readonly signals: readonly AluxBehaviorSignal[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export const NEUTRAL_MEMORY: AluxMemoryRecord = {
  version: ALUX_MEMORY_VERSION,
  subjectId: "",
  personalization: "active",
  signals: [],
  createdAt: 0,
  updatedAt: 0,
};

type Listener = (record: AluxMemoryRecord) => void;
const listeners = new Set<Listener>();
let cache: AluxMemoryRecord | null = null;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function randomSubjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rnd = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  return `${rnd()}-${rnd().slice(0, 4)}-4${rnd().slice(0, 3)}-a${rnd().slice(0, 3)}-${rnd()}${rnd().slice(0, 4)}`;
}

/** Normaliza y caduca un registro crudo. Devuelve null si no es rescatable. */
export function normalizeMemory(raw: unknown, now = Date.now()): AluxMemoryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AluxMemoryRecord>;
  if (r.version !== ALUX_MEMORY_VERSION) return null;
  if (typeof r.subjectId !== "string" || !r.subjectId) return null;
  if (typeof r.updatedAt !== "number" || !Number.isFinite(r.updatedAt)) return null;
  if (now - r.updatedAt > ALUX_MEMORY_TTL_MS) return null;
  const personalization: AluxPersonalizationState =
    r.personalization === "paused" ? "paused" : "active";
  const signals = pruneSignals(Array.isArray(r.signals) ? r.signals : [], now).slice(
    -ALUX_MEMORY_MAX_SIGNALS,
  );
  return {
    version: ALUX_MEMORY_VERSION,
    subjectId: r.subjectId,
    personalization,
    signals,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : r.updatedAt,
    updatedAt: r.updatedAt,
  };
}

function persist(record: AluxMemoryRecord): void {
  cache = record;
  if (hasWindow()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* almacenamiento no disponible ⇒ memoria sólo en esta pestaña */
    }
  }
  for (const listener of listeners) listener(record);
}

/** Lee la memoria vigente. Sin registro válido devuelve el estado neutro. */
export function readAluxMemory(now = Date.now()): AluxMemoryRecord {
  if (!hasWindow()) return NEUTRAL_MEMORY;
  if (cache) {
    const fresh = normalizeMemory(cache, now);
    if (fresh) return fresh;
  }
  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const record = normalizeMemory(parsed, now);
  cache = record;
  return record ?? NEUTRAL_MEMORY;
}

/** Garantiza registro con id seudónimo. No se llama en SSR. */
export function ensureAluxMemory(now = Date.now()): AluxMemoryRecord {
  const current = readAluxMemory(now);
  if (current.subjectId) return current;
  if (!hasWindow()) return NEUTRAL_MEMORY;
  const created: AluxMemoryRecord = {
    version: ALUX_MEMORY_VERSION,
    subjectId: randomSubjectId(),
    personalization: "active",
    signals: [],
    createdAt: now,
    updatedAt: now,
  };
  persist(created);
  return created;
}

/** Registra una señal permitida. No-op si la personalización está pausada. */
export function recordAluxSignal(
  signal: AluxBehaviorSignal,
  now = Date.now(),
): AluxMemoryRecord | null {
  if (!hasWindow()) return null;
  const current = ensureAluxMemory(now);
  if (current.personalization === "paused") return null;
  const next: AluxMemoryRecord = {
    ...current,
    signals: pruneSignals([...current.signals, signal], now).slice(-ALUX_MEMORY_MAX_SIGNALS),
    updatedAt: now,
  };
  persist(next);
  return next;
}

export function setAluxPersonalization(
  state: AluxPersonalizationState,
  now = Date.now(),
): AluxMemoryRecord {
  const current = ensureAluxMemory(now);
  const next: AluxMemoryRecord = { ...current, personalization: state, updatedAt: now };
  persist(next);
  return next;
}

/** Borra por completo lo que Alux recuerda en este dispositivo. */
export function clearAluxMemory(): void {
  cache = null;
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
  for (const listener of listeners) listener(NEUTRAL_MEMORY);
}

export function subscribeAluxMemory(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Resumen consumible por `rankAluxCandidates`. Pausada ⇒ resumen vacío
 * (Alux sigue recomendando, pero de forma general y declarada).
 */
export function getAluxSignalSummary(now = Date.now()): AluxSignalSummary {
  const memory = readAluxMemory(now);
  if (!memory.subjectId) return EMPTY_SIGNAL_SUMMARY;
  return summarizeSignals({
    signals: memory.signals,
    optedOut: memory.personalization === "paused",
    now,
  });
}
