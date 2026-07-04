/**
 * Navigation → Context Engine adapter (Navigation Blueprint v1.0 · N2.2).
 *
 * Traduce un `NavigationContext` (fuente única de navegación) en una
 * `RouteContextDeclaration` consumible por el Context Engine. Con esto
 * las rutas territoriales dejan de hardcodear labels/hrefs de ancestros
 * y `BreadcrumbTerritorial` (vía `useContextCrumbs`) renderiza siempre
 * la cadena canónica: Inicio → Oriente Maya → Destino → Categoría →
 * Empresa → Producto.
 *
 * REGLA (Navigation Blueprint): prohibido componer ancestros o
 * breadcrumbs manualmente en superficies. Toda superficie territorial
 * declara su contexto vía este adapter.
 */
import type { RouteContextDeclaration, ContextNode, ContextEntityKind } from "@/lib/context-engine/types";
import { resolveCanonicalPath } from "./canonical-paths";
import type { CanonicalRef, NavigationContext, NavEntityKind } from "./types";
import { DEFAULT_REGION_SLUG } from "./types";

function navKindToContextKind(kind: NavEntityKind): ContextEntityKind {
  switch (kind) {
    case "region":
      return "region";
    case "destination":
      return "destination";
    case "zone":
      return "zone";
    case "category":
      return "category";
    case "business":
    case "hotel":
    case "restaurant":
      return "business";
    case "product":
    case "experience":
    case "tour":
    case "service":
    case "craft":
      return "product";
    case "event":
      return "event";
    default:
      return "custom";
  }
}

function humanize(slug: string): string {
  return slug
    .split("-")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}

function toNode(ref: CanonicalRef): ContextNode {
  return {
    kind: navKindToContextKind(ref.kind),
    label: ref.label ?? humanize(ref.slug),
    slug: ref.slug,
    href: resolveCanonicalPath(ref),
  };
}

export interface NavigationContextDeclarationOptions {
  /**
   * Override de la hoja actual. Útil cuando la superficie conoce un
   * label más rico (ej. `business.display_name`, `product.name`) que
   * el contenido de `ctx.entity.label`.
   */
  readonly currentLabel?: string;
  readonly currentMeta?: Readonly<Record<string, unknown>>;
}

/**
 * Construye una `RouteContextDeclaration` a partir de un
 * `NavigationContext`. La hoja se elige por prioridad:
 * entity > business > category > destination > region.
 */
export function navigationContextToDeclaration(
  ctx: NavigationContext,
  opts: NavigationContextDeclarationOptions = {},
): RouteContextDeclaration {
  const region: CanonicalRef = ctx.region ?? {
    kind: "region",
    slug: DEFAULT_REGION_SLUG,
    label: "Oriente Maya",
  };

  const chain: CanonicalRef[] = [region];
  if (ctx.destination) chain.push(ctx.destination);
  if (ctx.category) chain.push(ctx.category);
  if (ctx.business) chain.push(ctx.business);
  if (ctx.entity) chain.push(ctx.entity);

  // Hoja = último eslabón de la cadena.
  const leaf = chain[chain.length - 1];
  const ancestors = chain.slice(0, -1).map(toNode);

  const currentBase = toNode(leaf);
  const current: ContextNode = {
    ...currentBase,
    label: opts.currentLabel ?? currentBase.label,
    meta: opts.currentMeta,
  };

  return {
    current,
    ancestors,
    canonical: current.href ?? "/",
  };
}