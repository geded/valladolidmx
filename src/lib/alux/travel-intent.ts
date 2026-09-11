/**
 * Ola A14 · Detector de intención de viaje.
 *
 * Clasifica *qué está buscando* el visitante ahora mismo a partir de:
 *  · pathname activo (categoría territorial),
 *  · señales A11 recientes (view_business, save_coupon, request_directions…),
 *  · lente M2 (cupones activos sin usar).
 *
 * Emite un `nudge` (badge + tooltip) para el concierge flotante con
 * cooldown por intención en `sessionStorage`. Cero intrusión: cada
 * intención se muestra máximo 1 vez cada 10 min, se descarta al
 * abrir el sheet y persiste sólo dentro de la sesión.
 */
import { useEffect, useMemo, useState } from "react";

export type TravelIntent =
  | "explorando"
  | "comparando_hoteles"
  | "buscando_comida"
  | "planeando_noche"
  | "cazando_cupones"
  | "perdido";

export interface TravelIntentNudge {
  intent: TravelIntent;
  message: string;
  detail?: string;
}

export const INTENT_NUDGE_MESSAGES: Record<TravelIntent, string | null> = {
  explorando: null,
  comparando_hoteles: "¿Te ayudo a elegir hotel?",
  buscando_comida: "¿Buscas dónde comer cerca?",
  planeando_noche: "¿Te armo un plan para esta noche?",
  cazando_cupones: "Tienes cupones activos — ¿los revisamos?",
  perdido: "¿Te oriento con algo específico?",
};

/**
 * Sugerencias contextuales por superficie.
 *
 * Viven DENTRO del mismo Alux global (como pistas iniciales del panel);
 * nunca como un segundo globo flotante. Una sola representación flotante
 * visible por pantalla.
 */
export function surfaceStarters(pathname: string, intent: TravelIntent): readonly string[] {
  const p = pathname.toLowerCase();
  const has = (s: string) => p.includes(s);

  if (has("hoteles") || has("casas-de-vacaciones")) {
    return ["¿Cómo te gustaría hospedarte?", "Opciones con encanto colonial", "Cerca del centro"];
  }
  if (has("restaurantes") || has("gastronomia")) {
    return ["¿Qué te gustaría comer?", "Abierto ahora cerca de mí", "Cocina yucateca tradicional"];
  }
  if (has("eventos")) {
    return ["¿Qué hay este fin de semana?", "Eventos para esta noche", "Actividades en familia"];
  }
  if (has("experiencias") || has("que-hacer") || has("tours")) {
    return ["¿Qué puedo hacer hoy?", "Experiencias de medio día", "Cenotes y naturaleza"];
  }
  if (has("rutas")) {
    return ["Personaliza esta ruta", "Versión más corta", "Con paradas para comer"];
  }
  if (has("lugares")) {
    return ["Sitios imperdibles", "Lugares cerca de mí", "Patrimonio y cultura maya"];
  }
  if (has("/oriente-maya")) {
    return ["¿Ya estás en la región o estás planeando?", "Arma mi plan del día", "Qué ver primero"];
  }
  if (p === "/" || p === "") {
    return ["¿Cómo viajas hoy?", "Estoy planeando mi viaje", "Ya estoy en la región"];
  }
  const fallback = INTENT_NUDGE_MESSAGES[intent];
  return fallback ? [fallback] : [];
}

const SIGNALS_KEY = "alux_recent_signals_v1";
const NUDGE_KEY = "alux_intent_nudge_v1";
const NUDGE_COOLDOWN_MS = 10 * 60 * 1000;
const SIGNAL_WINDOW_MS = 15 * 60 * 1000;
const MAX_SIGNALS = 25;

export interface RecentSignal {
  action: string;
  slug?: string;
  category?: string | null;
  at: number;
}

function safeRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function recordLocalSignal(input: {
  action: string;
  slug?: string;
  category?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const prev = safeRead<RecentSignal[]>(SIGNALS_KEY) ?? [];
  const now = Date.now();
  const next = [
    { action: input.action, slug: input.slug, category: input.category ?? null, at: now },
    ...prev.filter((s) => now - s.at < SIGNAL_WINDOW_MS),
  ].slice(0, MAX_SIGNALS);
  safeWrite(SIGNALS_KEY, next);
  // Dispara evento para que el hook reclasifique sin esperar re-render.
  window.dispatchEvent(new CustomEvent("alux:signals-updated"));
}

function readRecentSignals(): RecentSignal[] {
  const raw = safeRead<RecentSignal[]>(SIGNALS_KEY) ?? [];
  const now = Date.now();
  return raw.filter((s) => now - s.at < SIGNAL_WINDOW_MS);
}

export function classifyIntent(input: {
  pathname: string;
  signals: RecentSignal[];
  unusedCouponCount?: number;
  hourLocal?: number;
}): TravelIntent {
  const { pathname, signals, unusedCouponCount = 0, hourLocal } = input;

  const seg = pathname.split("/").filter(Boolean);
  const territorial = seg[0] === "oriente-maya";
  const category = territorial ? (seg[2] ?? "") : "";

  const bizViews = signals.filter((s) => s.action === "view_business").length;
  const savedCoupons = signals.filter((s) => s.action === "save_coupon").length;
  const askedDirections = signals.some((s) => s.action === "request_directions");

  if (pathname.startsWith("/promociones") || savedCoupons > 0 || unusedCouponCount >= 2) {
    return "cazando_cupones";
  }

  if (category === "hoteles" || bizViewsInCategory(signals, "hoteles") >= 2) {
    return "comparando_hoteles";
  }

  if (
    category === "restaurantes" ||
    category === "gastronomia" ||
    bizViewsInCategory(signals, "restaurantes") >= 2
  ) {
    return "buscando_comida";
  }

  if (category === "eventos" || pathname.includes("/eventos")) {
    if (typeof hourLocal === "number" && hourLocal >= 17) return "planeando_noche";
    return "explorando";
  }

  if (bizViews >= 4 && !askedDirections && savedCoupons === 0) {
    return "perdido";
  }

  return "explorando";
}

function bizViewsInCategory(signals: RecentSignal[], cat: string): number {
  return signals.filter((s) => s.action === "view_business" && s.category === cat).length;
}

interface NudgeState {
  lastShownAt: Partial<Record<TravelIntent, number>>;
}

function canShowNudge(intent: TravelIntent): boolean {
  if (intent === "explorando") return false;
  const state = safeRead<NudgeState>(NUDGE_KEY) ?? { lastShownAt: {} };
  const last = state.lastShownAt[intent] ?? 0;
  return Date.now() - last > NUDGE_COOLDOWN_MS;
}

export function markNudgeShown(intent: TravelIntent): void {
  const state = safeRead<NudgeState>(NUDGE_KEY) ?? { lastShownAt: {} };
  state.lastShownAt[intent] = Date.now();
  safeWrite(NUDGE_KEY, state);
}

export function useTravelIntent(input: { pathname: string; unusedCouponCount?: number }): {
  intent: TravelIntent;
  nudge: TravelIntentNudge | null;
} {
  const [signalsTick, setSignalsTick] = useState(0);

  useEffect(() => {
    const bump = () => setSignalsTick((t) => t + 1);
    window.addEventListener("alux:signals-updated", bump);
    return () => window.removeEventListener("alux:signals-updated", bump);
  }, []);

  const hourLocal = useMemo(() => new Date().getHours(), [input.pathname, signalsTick]);

  const intent = useMemo(
    () =>
      classifyIntent({
        pathname: input.pathname,
        signals: readRecentSignals(),
        unusedCouponCount: input.unusedCouponCount,
        hourLocal,
      }),
    [input.pathname, input.unusedCouponCount, signalsTick, hourLocal],
  );

  const nudge = useMemo<TravelIntentNudge | null>(() => {
    const message = INTENT_NUDGE_MESSAGES[intent];
    if (!message) return null;
    if (!canShowNudge(intent)) return null;
    return { intent, message };
  }, [intent]);

  return { intent, nudge };
}
