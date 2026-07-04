/**
 * Canonical Paths — Resolución bidireccional entre `CanonicalRef` y
 * pathname del ecosistema Oriente Maya (Navigation Blueprint v1.0 · N1).
 *
 * Modelo canónico:
 *   /oriente-maya
 *   /oriente-maya/:destino
 *   /oriente-maya/:destino/:categoria
 *   /oriente-maya/:destino/:categoria/:empresa
 *   /oriente-maya/:destino/:categoria/:empresa/:producto
 *
 * Rutas transversales (categorías globales, marketplace, plan, etc.)
 * NO se resuelven aquí; se manejan por sus rutas dedicadas.
 *
 * Reglas: sin trailing slash. Slugs kebab-case. Ámbito: rutas territoriales.
 */
import {
  DEFAULT_REGION_SLUG,
  type CanonicalRef,
  type NavigationContext,
} from "./types";

const REGION_PREFIX = `/${DEFAULT_REGION_SLUG}`;

function seg(s: string | undefined): string {
  return s ? `/${encodeURIComponent(s)}` : "";
}

/**
 * Construye el path canónico para una referencia territorial.
 * Prohibido interpolar rutas a mano en componentes.
 */
export function resolveCanonicalPath(ref: CanonicalRef): string {
  const region = ref.region ?? DEFAULT_REGION_SLUG;
  const base = region === DEFAULT_REGION_SLUG ? REGION_PREFIX : `/${region}`;

  switch (ref.kind) {
    case "region":
      return base;
    case "destination":
      return `${base}${seg(ref.slug)}`;
    case "zone":
      // Zonas viven bajo destino; hoy comparten espacio con destino.
      return `${base}${seg(ref.destination)}${seg(ref.slug)}`;
    case "category":
      return `${base}${seg(ref.destination)}${seg(ref.slug)}`;
    case "business":
      return `${base}${seg(ref.destination)}${seg(ref.category)}${seg(ref.slug)}`;
    case "product":
    case "experience":
    case "hotel":
    case "restaurant":
    case "event":
    case "tour":
    case "service":
    case "craft":
      return `${base}${seg(ref.destination)}${seg(ref.category)}${seg(ref.business)}${seg(ref.slug)}`;
  }
}

/**
 * Deriva `NavigationContext` a partir de un pathname territorial.
 * Devuelve `{}` para rutas fuera del árbol territorial (marketplace, plan,
 * institucionales, categorías globales).
 */
export function resolveContextFromPath(pathname: string): NavigationContext {
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  if (!clean.startsWith(REGION_PREFIX)) return {};

  const rest = clean.slice(REGION_PREFIX.length).replace(/^\/+/, "");
  if (rest.length === 0) {
    return {
      region: { kind: "region", slug: DEFAULT_REGION_SLUG },
    };
  }

  const parts = rest.split("/").map(decodeURIComponent);
  const [destino, categoria, empresa, producto] = parts;
  const region: CanonicalRef = { kind: "region", slug: DEFAULT_REGION_SLUG };
  const ctx: NavigationContext = { region };

  if (destino) {
    (ctx as any).destination = {
      kind: "destination",
      slug: destino,
      region: DEFAULT_REGION_SLUG,
    };
  }
  if (categoria) {
    (ctx as any).category = {
      kind: "category",
      slug: categoria,
      destination: destino,
      region: DEFAULT_REGION_SLUG,
    };
  }
  if (empresa) {
    (ctx as any).business = {
      kind: "business",
      slug: empresa,
      destination: destino,
      category: categoria,
      region: DEFAULT_REGION_SLUG,
    };
  }
  if (producto) {
    (ctx as any).entity = {
      kind: "product",
      slug: producto,
      destination: destino,
      category: categoria,
      business: empresa,
      region: DEFAULT_REGION_SLUG,
    };
  }
  return ctx;
}

/**
 * Cambia el destino conservando la categoría activa cuando existe.
 * La existencia real de la categoría equivalente se valida por el caller
 * (data layer); esta helper resuelve sólo la URL objetivo.
 */
export function switchDestination(
  ctx: NavigationContext,
  destino: string,
): string {
  const region = ctx.region?.slug ?? DEFAULT_REGION_SLUG;
  if (ctx.category?.slug) {
    return resolveCanonicalPath({
      kind: "category",
      slug: ctx.category.slug,
      destination: destino,
      region,
    });
  }
  return resolveCanonicalPath({
    kind: "destination",
    slug: destino,
    region,
  });
}