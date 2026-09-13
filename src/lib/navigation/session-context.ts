/**
 * Navigation Session Context — Persistencia territorial (Sub-ola N3).
 *
 * Guarda la última cadena territorial resuelta por el Context Engine
 * (region → destination → category → business → product) en
 * `sessionStorage` para habilitar continuidad de navegación al abrir
 * deep-links, refrescar el navegador o navegar con back/forward.
 *
 * Reglas del Navigation Blueprint v1.0:
 *  · Sólo lectura/escritura de metadatos ya derivados por el Context
 *    Engine. No compone rutas ni ejecuta side-effects fuera de storage.
 *  · SSR-safe: todos los accesos a `window`/`sessionStorage` guardados.
 *  · Sin dependencia de rutas específicas — trabaja sobre nodos
 *    canónicos (`ContextNode`).
 *  · TTL de 30 minutos, alineado con la duración típica de una
 *    sesión de descubrimiento; expirado se limpia perezosamente.
 *  · Cero impacto SEO: los datos jamás influyen en `canonical`,
 *    `og:*` ni en el HTML server-rendered.
 */
import { useEffect, useState } from "react";
import type { ContextNode, ResolvedContext } from "@/lib/context-engine";

const STORAGE_KEY = "vll:nav:session:v1";
const TTL_MS = 30 * 60_000;
const SCHEMA_VERSION = 1;

/** Slot territorial mínimo persistido. */
export interface NavigationSessionSlot {
  readonly slug: string;
  readonly label: string;
  readonly href?: string;
}

/** Snapshot territorial persistido en sessionStorage. */
export interface NavigationSessionSnapshot {
  readonly v: typeof SCHEMA_VERSION;
  readonly at: number;
  readonly canonical: string;
  readonly region?: NavigationSessionSlot;
  readonly destination?: NavigationSessionSlot;
  readonly category?: NavigationSessionSlot;
  readonly business?: NavigationSessionSlot;
  readonly product?: NavigationSessionSlot;
}

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function toSlot(node: ContextNode | undefined): NavigationSessionSlot | undefined {
  if (!node || !node.slug) return undefined;
  return { slug: node.slug, label: node.label, href: node.href };
}

/**
 * Deriva un snapshot territorial a partir del contexto resuelto.
 * Devuelve `null` si no hay ancla territorial (evita persistir Home,
 * Blog, Contacto, etc. y contaminar el store con contexto vacío).
 */
export function snapshotFromContext(ctx: ResolvedContext): NavigationSessionSnapshot | null {
  const destinationNode =
    ctx.destination ?? (ctx.current.kind === "destination" ? ctx.current : undefined);
  if (!destinationNode || !destinationNode.slug) return null;

  const categoryNode = ctx.category ?? (ctx.current.kind === "category" ? ctx.current : undefined);
  const businessNode =
    ctx.ancestors.find((n) => n.kind === "business") ??
    (ctx.current.kind === "business" ? ctx.current : undefined);
  const productNode = ctx.current.kind === "product" ? ctx.current : undefined;

  return {
    v: SCHEMA_VERSION,
    at: Date.now(),
    canonical: ctx.canonical,
    region: toSlot(ctx.region),
    destination: toSlot(destinationNode),
    category: toSlot(categoryNode),
    business: toSlot(businessNode),
    product: toSlot(productNode),
  };
}

function isFresh(snapshot: NavigationSessionSnapshot): boolean {
  if (typeof snapshot.at !== "number") return false;
  return Date.now() - snapshot.at <= TTL_MS;
}

/** Lee el snapshot vigente; expirados se descartan y limpian. */
export function readNavigationSession(): NavigationSessionSnapshot | null {
  if (!hasWindow()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavigationSessionSnapshot;
    if (!parsed || parsed.v !== SCHEMA_VERSION) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!isFresh(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Escribe el snapshot, evitando writes redundantes. */
export function writeNavigationSession(snapshot: NavigationSessionSnapshot): void {
  if (!hasWindow()) return;
  try {
    const current = sessionStorage.getItem(STORAGE_KEY);
    const next = JSON.stringify(snapshot);
    if (current === next) return;
    sessionStorage.setItem(STORAGE_KEY, next);
    // storage event no dispara en la pestaña actual — notificamos
    // vía CustomEvent para permitir sincronización intra-pestaña.
    window.dispatchEvent(new CustomEvent("vll:nav:session", { detail: snapshot }));
  } catch {
    // storage lleno / bloqueado → silencioso
  }
}

/**
 * Continuidad de ubicación en app instalada (PWA).
 *
 * iOS/Android relanzan la app instalada en `start_url` ("/") cuando el
 * sistema descarta el proceso (teléfono trabado, reinicio, cambio de
 * ajustes). Para no perder la ubicación del explorador guardamos la
 * última ruta pública visitada en `localStorage` (sobrevive al
 * relanzamiento, a diferencia de `sessionStorage`) y la restauramos
 * únicamente en ese arranque en frío.
 *
 * No afecta SSR, SEO ni la navegación normal del navegador.
 */
const LAST_ROUTE_KEY = "vll:nav:last-route:v1";

/** Rutas privadas/operativas que nunca se restauran automáticamente. */
const NON_RESTORABLE =
  /^\/(?:~oauth|api|auth|cms|portal|admin|cuenta|concierge|empresa|offline)(?:\/|$)/;

export function isRestorablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path === "/") return false;
  return !NON_RESTORABLE.test(path);
}

export function writeLastRoute(path: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  if (!isRestorablePath(path)) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // storage lleno / bloqueado → silencioso
  }
}

export function readLastRoute(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ROUTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { path?: string; at?: number };
    if (!parsed?.path || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > TTL_MS) {
      localStorage.removeItem(LAST_ROUTE_KEY);
      return null;
    }
    return isRestorablePath(parsed.path) ? parsed.path : null;
  } catch {
    return null;
  }
}

/** `true` cuando la app corre instalada (standalone), no en pestaña. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

/**
 * `true` cuando la app se muestra dentro del panel de vista previa de
 * Lovable (iframe sobre un host de preview). Ese panel siempre recarga
 * en `/`, por lo que el explorador perdía su ubicación al refrescar.
 * No aplica al sitio publicado ni a la navegación normal.
 */
export function isLovablePreviewFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.top === window.self) return false;
    const h = window.location.hostname;
    return (
      h.startsWith("id-preview--") ||
      h.startsWith("preview--") ||
      h === "lovableproject.com" ||
      h.endsWith(".lovableproject.com") ||
      h === "lovableproject-dev.com" ||
      h.endsWith(".lovableproject-dev.com") ||
      h.endsWith(".beta.lovable.dev") ||
      h === "localhost" ||
      h === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/**
 * Rastro de navegación (ruta anterior → ruta actual).
 *
 * La navegación del router es client-side, por lo que `document.referrer`
 * no refleja el paso previo. Guardamos únicamente el pathname anterior
 * para que superficies transversales (Alux, Arma tu Viaje) puedan
 * conservar el paso desde el que llegó el explorador en su ruta
 * territorial. Sin impacto SSR ni SEO.
 */
const ROUTE_TRAIL_KEY = "vll:nav:route-trail:v1";

const PLANNER_VISITED_KEY = "vll:nav:planner-visited:v1";

export function trackRouteTrail(path: string): void {
  if (!hasWindow()) return;
  try {
    if (path === "/arma-tu-viaje" || path.startsWith("/arma-tu-viaje/")) {
      sessionStorage.setItem(PLANNER_VISITED_KEY, "1");
    }
    const raw = sessionStorage.getItem(ROUTE_TRAIL_KEY);
    const parsed = raw ? (JSON.parse(raw) as { prev?: string; cur?: string }) : {};
    if (parsed.cur === path) return;
    sessionStorage.setItem(
      ROUTE_TRAIL_KEY,
      JSON.stringify({ prev: parsed.cur ?? null, cur: path }),
    );
  } catch {
    // storage bloqueado → silencioso
  }
}

/**
 * Indica si el visitante ya pasó por Arma tu Viaje en esta sesión.
 * Sobrevive a recargas y a la restauración de ruta del preview, donde el
 * rastro inmediato se pierde.
 */
export function hasVisitedTravelPlanner(): boolean {
  if (!hasWindow()) return false;
  try {
    return sessionStorage.getItem(PLANNER_VISITED_KEY) === "1";
  } catch {
    return false;
  }
}


/**
 * Devuelve el pathname anterior al actual. Los efectos de la página se
 * ejecutan antes que el puente global, por lo que el rastro puede no
 * haberse actualizado todavía: en ese caso `cur` ES la ruta anterior.
 */
export function readPreviousRoute(): string | null {
  if (!hasWindow()) return null;
  try {
    const raw = sessionStorage.getItem(ROUTE_TRAIL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { prev?: string | null; cur?: string | null };
    const here = window.location.pathname;
    if (typeof parsed.cur === "string" && parsed.cur !== here) return parsed.cur;
    return typeof parsed.prev === "string" ? parsed.prev : null;
  } catch {
    return null;
  }
}

export function clearNavigationSession(): void {
  if (!hasWindow()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("vll:nav:session", { detail: null }));
  } catch {
    // noop
  }
}

/**
 * Hook SSR-safe. En servidor devuelve `null`. En cliente sincroniza
 * con `sessionStorage` reaccionando a:
 *  · `storage` (cambios cross-tab)
 *  · `vll:nav:session` (cambios intra-pestaña, disparado por el bridge)
 */
export function useNavigationSession(): NavigationSessionSnapshot | null {
  const [snapshot, setSnapshot] = useState<NavigationSessionSnapshot | null>(null);
  useEffect(() => {
    setSnapshot(readNavigationSession());
    function refresh() {
      setSnapshot(readNavigationSession());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("vll:nav:session", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("vll:nav:session", refresh as EventListener);
    };
  }, []);
  return snapshot;
}
