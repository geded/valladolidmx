/**
 * CV8 · A1–A4 — Señales de sesión anónima, profundidad e intención.
 *
 * Mide PERSONAS, no páginas. Local-first: la sesión y la profundidad se
 * acumulan en el propio navegador (sessionStorage) y sólo se publican HITOS
 * al canal append-only existente (`ingestAnonymousVisitorEvent` /
 * `ingestVisitorEvent`) usando el contrato congelado v1.0.0.
 *
 * Invariantes:
 *  · Cero PII, cero fingerprinting, cero identificadores nuevos del visitante
 *    (el sujeto es el id seudónimo de la memoria de Alux).
 *  · Un hito por sesión: inicio, exploración profunda, primera intención.
 *  · Personalización pausada ⇒ no se publica nada.
 *  · Sin tablas nuevas ni ampliación del esquema de eventos.
 */
import { ensureAluxMemory } from "@/lib/alux/memory-store";

import type { VisitorEvent } from "./events";
import { VISITOR_EVENT_SCHEMA_VERSION } from "./events";
import {
  classifyDevice,
  classifyTrafficSource,
  normalizeRoute,
  type ConsentPurpose,
} from "./page-signals";

export { CONSENT_PURPOSES, parseConsentPurpose, type ConsentPurpose } from "./page-signals";

/** Umbrales de exploración profunda (T3): permanencia y superficies. */
export const DEEP_EXPLORATION_SURFACES = 3;
export const DEEP_EXPLORATION_DWELL_MS = 60_000;

const STORAGE_KEY = "vmx.visitor.session.v1";

export interface VisitorSessionState {
  /** Identificador de sesión seudónimo y rotativo (muere con la pestaña). */
  readonly sessionId: string;
  readonly startedAt: number;
  readonly routes: readonly string[];
  readonly startEmitted: boolean;
  readonly depthEmitted: boolean;
  readonly intentEmitted: boolean;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptySession(now: number): VisitorSessionState {
  return {
    sessionId: randomId(),
    startedAt: now,
    routes: [],
    startEmitted: false,
    depthEmitted: false,
    intentEmitted: false,
  };
}

/** Lee (o crea) el estado de sesión. SSR-safe. */
export function readSession(now = Date.now()): VisitorSessionState {
  if (typeof window === "undefined") return emptySession(now);
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VisitorSessionState>;
      if (typeof parsed.sessionId === "string" && parsed.sessionId) {
        return {
          sessionId: parsed.sessionId,
          startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : now,
          routes: Array.isArray(parsed.routes) ? parsed.routes.filter((r) => typeof r === "string") : [],
          startEmitted: parsed.startEmitted === true,
          depthEmitted: parsed.depthEmitted === true,
          intentEmitted: parsed.intentEmitted === true,
        };
      }
    }
  } catch {
    /* almacenamiento no disponible ⇒ sesión sólo en memoria */
  }
  const fresh = emptySession(now);
  writeSession(fresh);
  return fresh;
}

function writeSession(state: VisitorSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento ⇒ la sesión no persiste entre recargas */
  }
}

/** Núcleo puro: ¿la sesión califica como exploración profunda? */
export function isDeepExploration(
  state: Pick<VisitorSessionState, "routes" | "startedAt">,
  now: number,
): boolean {
  return (
    state.routes.length >= DEEP_EXPLORATION_SURFACES ||
    now - state.startedAt >= DEEP_EXPLORATION_DWELL_MS
  );
}

/** Contexto codificado (mismo formato legible del monitor). */
export function buildSessionSurface(input: {
  source: string;
  device: string;
  purpose: ConsentPurpose;
}): string {
  return `session|src:${input.source}|dev:${input.device}|cns:${input.purpose}`;
}

interface EmitBase {
  readonly isAuthenticated: boolean;
  readonly locale?: string;
  readonly pathname: string;
}

async function publish(event: VisitorEvent, isAuthenticated: boolean): Promise<boolean> {
  try {
    const mod = await import("./ingest.functions");
    const fn = isAuthenticated ? mod.ingestVisitorEvent : mod.ingestAnonymousVisitorEvent;
    const result = await fn({ data: { event } });
    return Boolean(result?.accepted);
  } catch {
    return false;
  }
}

function baseEvent(input: EmitBase, now: number) {
  const memory = ensureAluxMemory(now);
  const route = normalizeRoute(input.pathname);
  const source = classifyTrafficSource(
    document.referrer ?? "",
    window.location.search ?? "",
    window.location.origin,
  );
  const device = classifyDevice(window.innerWidth || 1440);
  return {
    memory,
    route,
    surface: buildSessionSurface({ source, device, purpose: "measurement" }),
    common: {
      event_id: randomId(),
      occurred_at: new Date(now).toISOString(),
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: {
        subject_id: memory.subjectId,
        trust_level: input.isAuthenticated ? ("N1_continuity" as const) : ("N0_anonymous" as const),
        is_authenticated: input.isAuthenticated,
        ...(input.locale ? { locale: input.locale } : {}),
      },
    },
  };
}

/** A1 · Inicio de sesión: transición T1 Extraño → Anónimo, una vez por sesión. */
export async function trackSessionStart(input: EmitBase): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const state = readSession(now);
  if (state.startEmitted) return false;

  const { memory, route, surface, common } = baseEvent(input, now);
  if (memory.personalization === "paused") return false;

  writeSession({ ...state, startEmitted: true });

  const event = {
    ...common,
    kind: "journey.transition",
    context: { surface, route },
    transition: {
      id: "T1_stranger_to_anonymous",
      from: "stranger",
      to: "anonymous",
      attributed_action: "visitor.session.started",
      influencing_capabilities: [],
    },
  } as unknown as VisitorEvent;
  return publish(event, input.isAuthenticated);
}

/**
 * A2 · Profundidad: acumula superficies distintas de la sesión y publica un
 * único hito de exploración profunda cuando se supera el umbral aprobado.
 */
export async function trackSurfaceVisited(input: EmitBase): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const state = readSession(now);
  const route = normalizeRoute(input.pathname);
  const routes = state.routes.includes(route) ? state.routes : [...state.routes, route].slice(-20);
  const next = { ...state, routes };

  if (state.depthEmitted || !isDeepExploration(next, now)) {
    writeSession(next);
    return false;
  }

  const { memory, surface, common } = baseEvent(input, now);
  if (memory.personalization === "paused") {
    writeSession(next);
    return false;
  }
  writeSession({ ...next, depthEmitted: true });

  const event = {
    ...common,
    kind: "intent.signal",
    context: { surface, route },
    intent: {
      action: "exploration_deepened",
      target_type: "session",
      strength: 0.5,
    },
  } as unknown as VisitorEvent;
  return publish(event, input.isAuthenticated);
}

/**
 * A3 · Primera intención anónima: el visitante guardó o agregó algo a su
 * viaje sin cuenta. Un hito por sesión; nunca una escritura por clic.
 */
export async function trackFirstIntent(
  input: EmitBase & { targetType?: string; targetId?: string },
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const state = readSession(now);
  if (state.intentEmitted) return false;

  const { memory, route, surface, common } = baseEvent(input, now);
  if (memory.personalization === "paused") return false;
  writeSession({ ...state, intentEmitted: true });

  const event = {
    ...common,
    kind: "intent.signal",
    context: { surface, route },
    intent: {
      action: "add_to_plan",
      target_type: input.targetType ?? "travel_plan",
      ...(input.targetId ? { target_id: input.targetId } : {}),
      strength: 0.8,
    },
  } as unknown as VisitorEvent;
  return publish(event, input.isAuthenticated);
}

/** Sólo para pruebas: reinicia el estado de sesión del navegador. */
export function __resetVisitorSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
