/**
 * Monitor de usuarios · M1 — Señales de página.
 *
 * Emite señales de navegación pública por el ÚNICO canal autorizado de
 * escritura (`ingestVisitorEvent` / `ingestAnonymousVisitorEvent`) y con el
 * contrato congelado v1.0.0 (`intent.signal`). No crea tablas, identificadores
 * ni proveedores nuevos: reutiliza el sujeto seudónimo de la memoria de Alux.
 *
 * Cero PII: sólo ruta canónica sin querystring, tipo de página, canal de
 * origen agrupado, clase de dispositivo e idioma.
 */
import { ensureAluxMemory } from "@/lib/alux/memory-store";

import { VISITOR_EVENT_SCHEMA_VERSION, type VisitorEvent } from "./events";

export const PAGE_SIGNAL_ACTIONS = ["page_view", "page_engaged", "cta_click"] as const;
export type PageSignalAction = (typeof PAGE_SIGNAL_ACTIONS)[number];

export const PAGE_TYPES = [
  "home",
  "landing_seo",
  "business",
  "product",
  "destination",
  "category",
  "experiences",
  "event",
  "route",
  "editorial",
  "other",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const TRAFFIC_SOURCES = ["campaign", "organic", "referral", "direct"] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

const SEARCH_ENGINE_HOSTS = [
  "google.",
  "bing.",
  "yahoo.",
  "duckduckgo.",
  "ecosia.",
  "brave.",
  "yandex.",
  "baidu.",
];

/** Clasifica la ruta pública en un tipo de página administrable. */
export function classifyPageType(pathname: string): PageType {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "home";
  if (path.startsWith("/l/")) return "landing_seo";
  if (path.startsWith("/producto/")) return "product";
  if (path.startsWith("/experiencias")) return "experiences";
  if (path.startsWith("/eventos")) return "event";
  if (path.startsWith("/rutas")) return "route";
  if (path.startsWith("/oriente-maya/")) {
    const segments = path.split("/").filter(Boolean); // oriente-maya/destino[/categoria[/empresa[/producto]]]
    if (segments.length >= 5) return "product";
    if (segments.length === 4) return "business";
    if (segments.length === 3) return "category";
    return "destination";
  }
  if (
    path.startsWith("/hoteles") ||
    path.startsWith("/restaurantes") ||
    path.startsWith("/casas-de-vacaciones") ||
    path.startsWith("/lugares")
  ) {
    return "category";
  }
  if (path.startsWith("/articulos") || path.startsWith("/blog")) return "editorial";
  return "other";
}

/** Agrupa el origen de la visita sin guardar la URL de referencia completa. */
export function classifyTrafficSource(referrer: string, search: string, origin: string): TrafficSource {
  const params = new URLSearchParams(search);
  if (
    params.get("utm_source") ||
    params.get("utm_campaign") ||
    params.get("gclid") ||
    params.get("fbclid")
  ) {
    return "campaign";
  }
  if (!referrer) return "direct";
  let host = "";
  try {
    const url = new URL(referrer);
    if (origin && url.origin === origin) return "direct";
    host = url.hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (SEARCH_ENGINE_HOSTS.some((engine) => host.includes(engine))) return "organic";
  return "referral";
}

/** Clase de dispositivo por ancho de viewport (sin fingerprinting). */
export function classifyDevice(viewportWidth: number): DeviceClass {
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1180) return "tablet";
  return "desktop";
}

/** Normaliza la ruta: sin querystring, sin hash, sin barra final. */
export function normalizeRoute(pathname: string): string {
  const clean = pathname.split("?")[0].split("#")[0];
  return clean.replace(/\/+$/, "") || "/";
}

export interface PageSignalInput {
  readonly action: PageSignalAction;
  readonly route: string;
  readonly pageType: PageType;
  readonly targetId?: string;
  readonly source: TrafficSource;
  readonly device: DeviceClass;
  readonly locale?: string;
  readonly isAuthenticated: boolean;
  readonly subjectId: string;
  readonly eventId: string;
  readonly occurredAt: string;
}

const STRENGTH: Record<PageSignalAction, number> = {
  page_view: 0.1,
  page_engaged: 0.35,
  cta_click: 0.7,
};

/** Construye el evento canónico. Pura: sin red ni almacenamiento. */
export function buildPageSignalEvent(input: PageSignalInput): VisitorEvent {
  return {
    event_id: input.eventId,
    occurred_at: input.occurredAt,
    schema_version: VISITOR_EVENT_SCHEMA_VERSION,
    kind: "intent.signal",
    subject: {
      subject_id: input.subjectId,
      trust_level: input.isAuthenticated ? "N1_continuity" : "N0_anonymous",
      is_authenticated: input.isAuthenticated,
      ...(input.locale ? { locale: input.locale } : {}),
    },
    context: {
      surface: `page:${input.pageType}|src:${input.source}|dev:${input.device}`,
      route: input.route,
    },
    intent: {
      action: input.action,
      target_type: input.pageType,
      ...(input.targetId ? { target_id: input.targetId } : {}),
      strength: STRENGTH[input.action],
    },
  } as VisitorEvent;
}

/** Lee del contexto codificado en `surface` (lectura del monitor). */
export function parsePageSurface(surface: string): {
  pageType: PageType;
  source: TrafficSource;
  device: DeviceClass;
} | null {
  const match = /^page:([a-z_]+)\|src:([a-z]+)\|dev:([a-z]+)$/.exec(surface);
  if (!match) return null;
  const [, pageType, source, device] = match;
  if (!(PAGE_TYPES as readonly string[]).includes(pageType)) return null;
  if (!(TRAFFIC_SOURCES as readonly string[]).includes(source)) return null;
  if (!(DEVICE_CLASSES as readonly string[]).includes(device)) return null;
  return {
    pageType: pageType as PageType,
    source: source as TrafficSource,
    device: device as DeviceClass,
  };
}

const emitted = new Map<string, number>();
const DEDUPE_MS = 30_000;

export interface EmitPageSignalInput {
  readonly action: PageSignalAction;
  readonly pathname: string;
  readonly targetId?: string;
  readonly isAuthenticated: boolean;
  readonly locale?: string;
}

/**
 * Publica la señal. Silenciosa ante cualquier fallo: la medición nunca puede
 * degradar la experiencia pública.
 */
export async function emitPageSignal(input: EmitPageSignalInput): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const route = normalizeRoute(input.pathname);
  const key = `${input.action}|${route}|${input.targetId ?? ""}`;
  const last = emitted.get(key);
  if (typeof last === "number" && now - last < DEDUPE_MS) return false;
  emitted.set(key, now);

  const memory = ensureAluxMemory(now);
  if (memory.personalization === "paused") return false;

  const event = buildPageSignalEvent({
    action: input.action,
    route,
    pageType: classifyPageType(route),
    targetId: input.targetId,
    source: classifyTrafficSource(
      document.referrer ?? "",
      window.location.search ?? "",
      window.location.origin,
    ),
    device: classifyDevice(window.innerWidth || 1440),
    locale: input.locale,
    isAuthenticated: input.isAuthenticated,
    subjectId: memory.subjectId,
    eventId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(16).slice(2)}`,
    occurredAt: new Date(now).toISOString(),
  });

  try {
    const mod = await import("./ingest.functions");
    const fn = input.isAuthenticated ? mod.ingestVisitorEvent : mod.ingestAnonymousVisitorEvent;
    const result = await fn({ data: { event } });
    return Boolean(result?.accepted);
  } catch {
    return false;
  }
}

/** Sólo para pruebas: limpia la deduplicación del proceso. */
export function __resetPageSignalState(): void {
  emitted.clear();
}
