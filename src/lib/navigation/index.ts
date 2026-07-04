/**
 * Navigation Contract — Barrel oficial (Navigation Blueprint v1.0 · N1).
 *
 * Toda superficie pública consume navegación exclusivamente desde aquí.
 * Prohibido componer rutas o breadcrumbs manualmente en componentes.
 */
export type {
  NavEntityKind,
  CanonicalRef,
  NavigationContext,
  BreadcrumbCrumb,
  MotivationRef,
  TemporalRef,
  ProfileRef,
} from "./types";
export { DEFAULT_REGION_SLUG } from "./types";
export {
  resolveCanonicalPath,
  resolveContextFromPath,
  switchDestination,
} from "./canonical-paths";
export { buildBreadcrumbs, type BuildBreadcrumbsOptions } from "./breadcrumbs";