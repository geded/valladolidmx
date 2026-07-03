/**
 * Experience Builder · Page Kind Registry (US-R1 · Recovery Plan §1)
 *
 * Fuente única declarativa de los tipos de página gestionables desde el
 * Studio. NO es un engine: sólo describe metadatos (label, alcance de
 * bloques, patrón de slug, plantilla semilla, rol requerido, singleton).
 *
 * Reglas vinculantes (Single Studio + Product Vision Rule):
 *  - El `kind` NO determina un editor distinto. Determina qué plantilla
 *    y qué subset de bloques ve el editor dentro del mismo VisualStudio.
 *  - Ninguna capacidad existente puede reducirse por añadir un kind.
 *  - Añadir un kind = añadir una entrada aquí + valor al enum
 *    `eb_page_kind` en migración. Sin código nuevo del editor.
 */

import type { Database } from "@/integrations/supabase/types";

/** Enum canónico de kinds gestionados por el Experience Builder. */
export type PageKind = Database["public"]["Enums"]["eb_page_kind"];

export type PageKindRole = "admin" | "super_admin" | "editor";

export interface PageKindDefinition {
  /** Enum id — debe existir en `public.eb_page_kind`. */
  readonly kind: PageKind;
  /** Etiqueta corta para el Studio. */
  readonly label: string;
  /** Descripción breve para el diálogo "Nueva página". */
  readonly description: string;
  /**
   * Patrón de slug del `kind` (informativo).
   *   - `{slug}` para composiciones parametrizadas.
   *   - Cadena literal (p. ej. `"/"`, `"/marketplace"`) para singletons.
   */
  readonly slugPattern: string;
  /**
   * Sólo puede existir una composición publicada de este kind (Home,
   * Marketplace, /alux, /arma-tu-viaje, secciones globales).
   */
  readonly singleton: boolean;
  /**
   * Roles autorizados para crear/editar páginas de este kind desde el
   * Studio. Los empresarios NO editan aquí (Product Vision).
   */
  readonly requiredRoles: readonly PageKindRole[];
  /**
   * Ruta pública que servirá la composición (para el diálogo de "Ver").
   * Puede contener `{slug}` como marcador.
   */
  readonly publicRoutePattern: string;
  /**
   * Familias/categorías de la Block Library permitidas. `null` = todas.
   * Se aplica como filtro visual en la biblioteca; el contrato de bloques
   * no cambia.
   */
  readonly allowedBlockCategories: readonly string[] | null;
  /**
   * Defaults SEO/sitemap por kind (US-R3 · R3.15, R3.19, R3.26). Los
   * editores pueden sobreescribir por composición desde el Studio.
   */
  readonly defaults?: {
    /** JSON-LD @type por defecto (WebPage, Product, Place, Event…). */
    readonly jsonLdType?: string;
    /** `changefreq` sugerida para el sitemap. */
    readonly sitemapChangefreq?:
      | "always"
      | "hourly"
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "never";
    /** Prioridad 0..1 sugerida para el sitemap. */
    readonly sitemapPriority?: number;
    /** `Cache-Control` sugerido para SSR. */
    readonly cacheControl?: string;
    /** Ruta padre para redirect por defecto al despublicar (R3.22). */
    readonly unpublishFallbackPath?: string;
  };
}

/**
 * Catálogo canónico de kinds del Experience Builder. El orden se usa
 * como orden por defecto en el panel de páginas.
 */
export const PAGE_KIND_REGISTRY: readonly PageKindDefinition[] = [
  {
    kind: "home",
    label: "Home",
    description: "Portada pública de Valladolid.mx.",
    slugPattern: "/",
    singleton: true,
    requiredRoles: ["admin", "super_admin"],
    publicRoutePattern: "/",
    allowedBlockCategories: null,
  },
  {
    kind: "marketplace",
    label: "Marketplace",
    description: "Catálogo público del marketplace y sus secciones.",
    slugPattern: "/marketplace",
    singleton: true,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/marketplace",
    allowedBlockCategories: null,
  },
  {
    kind: "landing",
    label: "Landing",
    description: "Landing de campaña o producto editorial.",
    slugPattern: "/l/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/l/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "campaign",
    label: "Campaña",
    description: "Composición de campaña multiformato.",
    slugPattern: "/l/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/l/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "microsite",
    label: "Micrositio",
    description: "Micrositio institucional o de aliado.",
    slugPattern: "/p/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/p/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "institutional",
    label: "Institucional",
    description: "Páginas institucionales (aviso, términos, prensa…).",
    slugPattern: "/p/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/p/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "promo",
    label: "Promoción",
    description: "Landing de promoción editorial.",
    slugPattern: "/l/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/l/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "destination",
    label: "Destino",
    description: "Composición editorial de un destino de Oriente Maya.",
    slugPattern: "/oriente-maya/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/oriente-maya/{slug}",
    allowedBlockCategories: null,
  },
  {
    // US-R3 · Ola 2 · Sub-ola 2.1 — H-R3-4 (Region como kind oficial).
    // Aunque Oriente Maya es hoy la única región publicada, la ruta
    // pública sigue el patrón `/{regionSlug}` para futuras regiones.
    kind: "region",
    label: "Región",
    description: "Ficha oficial de una Región turística (índice de destinos).",
    slugPattern: "/{regionSlug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/{regionSlug}",
    allowedBlockCategories: null,
  },
  {
    kind: "route",
    label: "Ruta",
    description: "Ruta editorial (itinerario, ruta gastronómica, etc.).",
    slugPattern: "/p/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/p/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "experience",
    label: "Experiencia",
    description: "Página editorial de experiencia turística.",
    slugPattern: "/experiencias/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/experiencias/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "hotel",
    label: "Hotel",
    description: "Ficha editorial de hotel.",
    slugPattern: "/hoteles/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/hoteles/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "restaurant",
    label: "Restaurante",
    description: "Ficha editorial de restaurante.",
    slugPattern: "/restaurantes/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/restaurantes/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "event",
    label: "Evento",
    description: "Ficha editorial de evento.",
    slugPattern: "/eventos/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/eventos/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "business",
    label: "Empresa",
    description: "Ficha editorial de empresa (zonas editables por dueño).",
    slugPattern: "/empresas/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/empresas/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "product",
    label: "Producto",
    description: "Ficha editorial de producto del marketplace.",
    slugPattern: "/marketplace/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/marketplace/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "alux",
    label: "Alux",
    description: "Página pública consultiva del concierge Alux.",
    slugPattern: "/alux",
    singleton: true,
    requiredRoles: ["admin", "super_admin"],
    publicRoutePattern: "/alux",
    allowedBlockCategories: null,
  },
  {
    kind: "trip_builder",
    label: "Arma tu viaje",
    description: "Composición editorial del constructor de viajes.",
    slugPattern: "/arma-tu-viaje",
    singleton: true,
    requiredRoles: ["admin", "super_admin"],
    publicRoutePattern: "/arma-tu-viaje",
    allowedBlockCategories: null,
  },
  {
    kind: "site_section",
    label: "Sección global",
    description: "Cabeceras, secciones globales o navegación editorial.",
    slugPattern: "internal:{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin"],
    publicRoutePattern: "",
    allowedBlockCategories: null,
  },
  {
    kind: "wedding",
    label: "Boda destino",
    description: "Landing editorial de bodas destino.",
    slugPattern: "/l/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/l/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "ai_generated",
    label: "Generada por Alux",
    description: "Composición generada asistida por Alux (revisar antes de publicar).",
    slugPattern: "/p/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin"],
    publicRoutePattern: "/p/{slug}",
    allowedBlockCategories: null,
  },
  {
    kind: "custom",
    label: "Personalizada",
    description: "Composición personalizada sin plantilla predefinida.",
    slugPattern: "/p/{slug}",
    singleton: false,
    requiredRoles: ["admin", "super_admin", "editor"],
    publicRoutePattern: "/p/{slug}",
    allowedBlockCategories: null,
  },
] as const;

const REGISTRY_BY_KIND: ReadonlyMap<PageKind, PageKindDefinition> = new Map(
  PAGE_KIND_REGISTRY.map((entry) => [entry.kind, entry] as const),
);

/** Devuelve la definición canónica de un kind, o `undefined` si no existe. */
export function getPageKindDefinition(kind: PageKind | string): PageKindDefinition | undefined {
  return REGISTRY_BY_KIND.get(kind as PageKind);
}

/** Lista ordenada de kinds registrados. */
export function listPageKinds(): readonly PageKindDefinition[] {
  return PAGE_KIND_REGISTRY;
}

/** ¿El rol puede crear/editar este kind desde el Studio? */
export function canEditPageKind(kind: PageKind | string, roles: readonly string[]): boolean {
  const def = getPageKindDefinition(kind);
  if (!def) return false;
  return def.requiredRoles.some((r) => roles.includes(r));
}

/**
 * Defaults SEO/sitemap/cache por kind (US-R3 · R3.15, R3.19, R3.22, R3.26).
 *
 * Devuelve la combinación de `def.defaults` (si el kind los declaró
 * explícitamente) con un fallback conservador coherente con la
 * naturaleza del kind (singleton → mayor prioridad, ficha → Place/Event
 * schema). Nunca lanza: para kinds desconocidos devuelve defaults
 * genéricos.
 */
export interface ResolvedKindDefaults {
  readonly jsonLdType: string;
  readonly sitemapChangefreq:
    | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  readonly sitemapPriority: number;
  readonly cacheControl: string;
  readonly unpublishFallbackPath: string;
}

const FALLBACK_BY_KIND: Partial<Record<PageKind, ResolvedKindDefaults>> = {
  home:         { jsonLdType: "WebSite",  sitemapChangefreq: "daily",   sitemapPriority: 1.0, cacheControl: "public, max-age=60, s-maxage=120",  unpublishFallbackPath: "/" },
  marketplace:  { jsonLdType: "WebPage",  sitemapChangefreq: "hourly",  sitemapPriority: 0.9, cacheControl: "public, max-age=60, s-maxage=120",  unpublishFallbackPath: "/marketplace" },
  destination:  { jsonLdType: "Place",    sitemapChangefreq: "weekly",  sitemapPriority: 0.8, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/oriente-maya" },
  experience:   { jsonLdType: "TouristAttraction", sitemapChangefreq: "weekly",  sitemapPriority: 0.7, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/experiencias" },
  hotel:        { jsonLdType: "Hotel",    sitemapChangefreq: "weekly",  sitemapPriority: 0.7, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/hoteles" },
  restaurant:   { jsonLdType: "Restaurant", sitemapChangefreq: "weekly", sitemapPriority: 0.7, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/restaurantes" },
  event:        { jsonLdType: "Event",    sitemapChangefreq: "daily",   sitemapPriority: 0.7, cacheControl: "public, max-age=120, s-maxage=300", unpublishFallbackPath: "/eventos" },
  business:     { jsonLdType: "LocalBusiness", sitemapChangefreq: "weekly", sitemapPriority: 0.7, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/empresas" },
  product:      { jsonLdType: "Product",  sitemapChangefreq: "weekly",  sitemapPriority: 0.7, cacheControl: "public, max-age=300, s-maxage=600", unpublishFallbackPath: "/marketplace" },
  landing:      { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.6, cacheControl: "public, max-age=300, s-maxage=900", unpublishFallbackPath: "/" },
  campaign:     { jsonLdType: "WebPage",  sitemapChangefreq: "weekly",  sitemapPriority: 0.6, cacheControl: "public, max-age=300, s-maxage=900", unpublishFallbackPath: "/" },
  promo:        { jsonLdType: "WebPage",  sitemapChangefreq: "weekly",  sitemapPriority: 0.6, cacheControl: "public, max-age=300, s-maxage=900", unpublishFallbackPath: "/" },
  microsite:    { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.5, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  institutional:{ jsonLdType: "WebPage",  sitemapChangefreq: "yearly",  sitemapPriority: 0.3, cacheControl: "public, max-age=3600, s-maxage=86400", unpublishFallbackPath: "/" },
  route:        { jsonLdType: "TouristTrip", sitemapChangefreq: "monthly", sitemapPriority: 0.6, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  alux:         { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.5, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  trip_builder: { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.5, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  wedding:      { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.5, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  ai_generated: { jsonLdType: "WebPage",  sitemapChangefreq: "weekly",  sitemapPriority: 0.4, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  custom:       { jsonLdType: "WebPage",  sitemapChangefreq: "monthly", sitemapPriority: 0.5, cacheControl: "public, max-age=600, s-maxage=1800", unpublishFallbackPath: "/" },
  site_section: { jsonLdType: "WebPage",  sitemapChangefreq: "yearly",  sitemapPriority: 0.1, cacheControl: "public, max-age=3600, s-maxage=86400", unpublishFallbackPath: "/" },
};

const GENERIC_DEFAULTS: ResolvedKindDefaults = {
  jsonLdType: "WebPage",
  sitemapChangefreq: "monthly",
  sitemapPriority: 0.5,
  cacheControl: "public, max-age=600, s-maxage=1800",
  unpublishFallbackPath: "/",
};

export function resolvePageKindDefaults(kind: PageKind | string): ResolvedKindDefaults {
  const def = getPageKindDefinition(kind);
  const fallback: ResolvedKindDefaults =
    FALLBACK_BY_KIND[kind as PageKind] ?? GENERIC_DEFAULTS;
  const declared = def?.defaults;
  if (!declared) return fallback;
  return {
    jsonLdType: declared.jsonLdType ?? fallback.jsonLdType,
    sitemapChangefreq: declared.sitemapChangefreq ?? fallback.sitemapChangefreq,
    sitemapPriority: declared.sitemapPriority ?? fallback.sitemapPriority,
    cacheControl: declared.cacheControl ?? fallback.cacheControl,
    unpublishFallbackPath: declared.unpublishFallbackPath ?? fallback.unpublishFallbackPath,
  };
}

/**
 * R3.43 · Toda superficie pública presente o futura debe registrarse
 * en el Page Kind Registry. Este helper valida que un `kind` propuesto
 * exista antes de crear una composición; los flujos de "Nueva página"
 * ya lo consultan indirectamente vía `listPageKinds()`.
 */
export function assertRegisteredKind(kind: PageKind | string): PageKindDefinition {
  const def = getPageKindDefinition(kind);
  if (!def) {
    throw new Error(
      `El kind "${kind}" no está registrado en el Page Kind Registry. ` +
        `US-R3 R3.43: toda superficie pública debe registrarse aquí antes de crearse.`,
    );
  }
  return def;
}