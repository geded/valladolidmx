/**
 * Breadcrumbs canónicos (Navigation Blueprint v1.0 · N1).
 *
 * Genera migajas territoriales a partir de un `NavigationContext`.
 * Prohibido componer breadcrumbs manualmente en superficies públicas.
 * (La integración con `useContextCrumbs` de PublicShell llega en N3.)
 */
import { resolveCanonicalPath } from "./canonical-paths";
import type { BreadcrumbCrumb, NavigationContext } from "./types";
import { DEFAULT_REGION_SLUG } from "./types";

function label(ref: { slug: string; label?: string } | undefined): string {
  if (!ref) return "";
  return ref.label ?? humanize(ref.slug);
}

function humanize(slug: string): string {
  return slug
    .split("-")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}

export interface BuildBreadcrumbsOptions {
  readonly homeLabel?: string;
  readonly regionLabel?: string;
  /** Etiqueta de la hoja actual (override editorial). */
  readonly currentLabel?: string;
  /** Incluir la migaja "Inicio". Default true. */
  readonly includeHome?: boolean;
}

export function buildBreadcrumbs(
  ctx: NavigationContext,
  opts: BuildBreadcrumbsOptions = {},
): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [];
  const includeHome = opts.includeHome ?? true;

  if (includeHome) {
    crumbs.push({ label: opts.homeLabel ?? "Inicio", href: "/", kind: "home" });
  }

  const region = ctx.region ?? {
    kind: "region" as const,
    slug: DEFAULT_REGION_SLUG,
  };
  crumbs.push({
    label: opts.regionLabel ?? label(region) ?? "Oriente Maya",
    href: resolveCanonicalPath(region),
    kind: "region",
  });

  if (ctx.destination) {
    crumbs.push({
      label: label(ctx.destination),
      href: resolveCanonicalPath(ctx.destination),
      kind: "destination",
    });
  }
  if (ctx.category) {
    crumbs.push({
      label: label(ctx.category),
      href: resolveCanonicalPath(ctx.category),
      kind: "category",
    });
  }
  if (ctx.business) {
    crumbs.push({
      label: label(ctx.business),
      href: resolveCanonicalPath(ctx.business),
      kind: "business",
    });
  }
  if (ctx.entity) {
    crumbs.push({
      label: opts.currentLabel ?? label(ctx.entity),
      href: resolveCanonicalPath(ctx.entity),
      kind: ctx.entity.kind,
    });
  }

  // Última migaja marcada como actual y sin link.
  const last = crumbs[crumbs.length - 1];
  if (last) {
    (crumbs[crumbs.length - 1] as any) = {
      ...last,
      href: undefined,
      isCurrent: true,
    };
  }

  // Override del label de la hoja actual cuando no hay entity pero sí override.
  if (opts.currentLabel && !ctx.entity) {
    (crumbs[crumbs.length - 1] as any).label = opts.currentLabel;
  }

  return crumbs;
}