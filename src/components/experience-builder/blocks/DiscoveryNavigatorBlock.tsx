/**
 * Experience Builder wrapper para `vmx.discovery.navigator`.
 *
 * Resuelve el scope territorial (params de ruta + config del bloque),
 * consulta `getDiscoveryNavigator` vía TanStack Query y delega el
 * render al componente presentacional `DiscoveryNavigator`.
 */
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DiscoveryNavigator } from "@/components/discovery/DiscoveryNavigator";
import { InlineCategoryExplorer } from "@/components/discovery/InlineCategoryExplorer";
import {
  discoveryNavigatorQueryOptions,
  type DiscoveryNavigatorDTO,
} from "@/lib/discovery/discovery-navigator.functions";

export interface DiscoveryNavigatorBlockConfig {
  title?: string;
  variant?: "panel" | "list" | "grid";
  showCounts?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  emptyLabel?: string;
  /** `auto` (default) resuelve desde router; `manual` usa los slugs siguientes. */
  scope?: "auto" | "destination" | "region";
  manualDestinationSlug?: string;
  manualRegionSlug?: string;
  /**
   * `navigate` (default): los chips llevan a rutas globales.
   * `inline`: los chips abren un explorador embebido debajo del bloque,
   * sin sacar al visitante del micrositio.
   */
  mode?: "navigate" | "inline";
  /** Tarjetas por página en el explorador embebido. */
  pageSize?: number;
}

export function DiscoveryNavigatorBlock({
  config = {},
  previewData,
}: {
  config?: DiscoveryNavigatorBlockConfig;
  /** Datos precomputados (Studio preview / SSR). */
  previewData?: DiscoveryNavigatorDTO;
}) {
  const params = useParams({ strict: false }) as { destino?: string };
  const scope = config.scope ?? "auto";
  const destinationSlug =
    scope === "region"
      ? null
      : scope === "destination"
        ? (config.manualDestinationSlug ?? params.destino ?? null)
        : (params.destino ?? null);
  const regionSlug =
    scope === "region" ? (config.manualRegionSlug ?? "oriente-maya") : null;

  const options = discoveryNavigatorQueryOptions({ destinationSlug, regionSlug });
  const query = useQuery({ ...options, initialData: previewData });

  const dto = query.data;
  const categories = dto?.categories ?? [];
  const scopeLabel = dto?.scope.label ?? null;
  const defaultTitle = scopeLabel ? `Explora ${scopeLabel}` : "Explora el destino";
  const defaultCtaLabel = scopeLabel
    ? `Ver todo lo que ofrece ${scopeLabel}`
    : "Ver todo el destino";
  const defaultCtaHref = destinationSlug
    ? `/oriente-maya/${destinationSlug}`
    : "/oriente-maya";

  const mode = config.mode ?? "navigate";
  const isInline = mode === "inline" && Boolean(destinationSlug);

  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { explora?: string };
  // En modo inline, el explorador está activo por defecto en "todo"
  // (mapa interactivo con TODOS los negocios del destino). Al elegir
  // una categoría, el mapa y las tarjetas se filtran a esa categoría.
  const activeCategory = isInline ? (search?.explora ?? "todo") : null;

  const totalCount = categories.reduce((s, c) => s + (c.count ?? 0), 0);
  const allChip = isInline
    ? {
        slug: "todo",
        label: "Todo el destino",
        iconKey: "layers",
        count: totalCount,
        href: destinationSlug ? `/oriente-maya/${destinationSlug}` : "#explora",
      }
    : null;
  const chipCategories = allChip ? [allChip, ...categories] : categories;

  const setActive = (slug: string | null) => {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        explora: slug ?? undefined,
      }),
      replace: true,
    });
    if (slug && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        document
          .querySelector("[data-inline-explorer]")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const activeCategoryItem =
    activeCategory != null
      ? chipCategories.find((c) => c.slug === activeCategory) ?? null
      : null;

  return (
    <div className="space-y-4">
      <DiscoveryNavigator
        title={config.title ?? defaultTitle}
        variant={config.variant ?? "panel"}
        showCounts={config.showCounts ?? true}
        categories={chipCategories}
        ctaLabel={isInline ? "" : (config.ctaLabel ?? defaultCtaLabel)}
        ctaHref={isInline ? "" : (config.ctaHref ?? defaultCtaHref)}
        emptyLabel={config.emptyLabel ?? "Aún no hay categorías publicadas."}
        mode={mode}
        activeCategory={activeCategory}
        onSelect={(slug) =>
          // Nunca desactivar en modo inline: al deseleccionar una
          // categoría, se vuelve al estado "todo" (mapa global).
          setActive(activeCategory === slug ? (isInline ? "todo" : null) : slug)
        }
      />
      {isInline && activeCategory && destinationSlug ? (
        <InlineCategoryExplorer
          destinationSlug={destinationSlug}
          destinationName={scopeLabel}
          categorySlug={activeCategory}
          categoryLabel={activeCategoryItem?.label ?? activeCategory}
          pageSize={config.pageSize ?? 8}
          onClose={
            activeCategory === "todo" ? undefined : () => setActive("todo")
          }
        />
      ) : null}
    </div>
  );
}

/** Preview neutral para Studio (sin conexión al Context Engine). */
export function DiscoveryNavigatorPreview() {
  const demo: DiscoveryNavigatorDTO = {
    scope: { kind: "destination", slug: "valladolid", label: "Valladolid" },
    categories: [
      { slug: "hoteles", label: "Hoteles", iconKey: "bed-double", count: 39, href: "/hoteles?destino=valladolid" },
      { slug: "restaurantes", label: "Restaurantes", iconKey: "utensils", count: 30, href: "/restaurantes?destino=valladolid" },
      { slug: "experiencias", label: "Experiencias", iconKey: "compass", count: 10, href: "/experiencias?destino=valladolid" },
      { slug: "casas-de-vacaciones", label: "Casas de vacaciones", iconKey: "home", count: 20, href: "/casas-de-vacaciones?destino=valladolid" },
      { slug: "que-hacer", label: "¿Qué hacer?", iconKey: "binoculars", count: 22, href: "/que-hacer?destino=valladolid" },
    ],
    extensions: [],
  };
  return (
    <DiscoveryNavigator
      title="Explora Valladolid"
      categories={demo.categories}
      ctaLabel="Ver todo lo que ofrece Valladolid"
      ctaHref="/oriente-maya/valladolid"
    />
  );
}