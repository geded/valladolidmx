/**
 * Navigation Contract — Fuente única de tipos de navegación pública
 * del ecosistema Oriente Maya de Yucatán (Navigation Blueprint v1.0 · Ola N1).
 *
 * Consumidores autorizados: PublicShell, breadcrumbs territoriales, mega-menú,
 * Cards Registry, related-content, CTAs contextuales, Alux, sitemap.
 *
 * REGLA: prohibido hardcodear rutas o migajas fuera de este contrato.
 *
 * Reservado (Navigation Intelligence, épica futura): los campos
 * `motivation`, `temporal`, `profile` quedan declarados desde v1.0 para
 * evitar refactor de firmas cuando se abra la evolución multidimensional.
 * Ningún consumidor los lee en Ola N1..N9.
 */

/** Tipos canónicos de entidad enrutable del modelo territorial. */
export type NavEntityKind =
  | "region"
  | "destination"
  | "zone"
  | "category"
  | "business"
  | "product"
  | "experience"
  | "hotel"
  | "restaurant"
  | "event"
  | "tour"
  | "service"
  | "craft";

/**
 * Referencia canónica a una entidad enrutable. Mínimo `kind` + `slug`;
 * los ancestros (`destination`, `category`, `business`, `region`) son
 * opcionales para admitir referencias parciales en descubrimiento.
 */
export interface CanonicalRef {
  readonly kind: NavEntityKind;
  readonly slug: string;
  readonly destination?: string;
  readonly category?: string;
  readonly business?: string;
  /** Región turística. Default: "oriente-maya". */
  readonly region?: string;
  /** Etiqueta editorial opcional (breadcrumbs, cards, SEO). */
  readonly label?: string;
}

/** Reservado para Navigation Intelligence. No consumir en Ola N1..N9. */
export interface MotivationRef {
  readonly slug: string;
  readonly label?: string;
}

/** Reservado para Navigation Intelligence. No consumir en Ola N1..N9. */
export interface TemporalRef {
  readonly slug: string;
  readonly label?: string;
  readonly from?: string;
  readonly to?: string;
}

/** Reservado para Navigation Intelligence. No consumir en Ola N1..N9. */
export interface ProfileRef {
  readonly slug: string;
  readonly label?: string;
}

/**
 * Contexto de navegación resuelto para una superficie pública.
 * Consumido por breadcrumbs, switcher de destino, related-content, CTAs,
 * Alux y sitemap.
 */
export interface NavigationContext {
  readonly region?: CanonicalRef;
  readonly destination?: CanonicalRef;
  readonly category?: CanonicalRef;
  readonly business?: CanonicalRef;
  /** Producto / experiencia / evento actual (hoja). */
  readonly entity?: CanonicalRef;
  /** Ruta previa — preserva contexto tras autenticación o checkout. */
  readonly origin?: string;
  readonly utm?: Readonly<Record<string, string>>;

  // ── Reservado · Navigation Intelligence (épica futura) ──────────────
  /** Reservado. No consumir en Ola N1..N9. */
  readonly motivation?: MotivationRef;
  /** Reservado. No consumir en Ola N1..N9. */
  readonly temporal?: TemporalRef;
  /** Reservado. No consumir en Ola N1..N9. */
  readonly profile?: ProfileRef;
}

/** Migaja canónica consumida por el breadcrumb territorial. */
export interface BreadcrumbCrumb {
  readonly label: string;
  readonly href?: string;
  readonly isCurrent?: boolean;
  readonly kind?: NavEntityKind | "home";
}

/** Región turística por defecto (v1.0 sólo Oriente Maya). */
export const DEFAULT_REGION_SLUG = "oriente-maya";