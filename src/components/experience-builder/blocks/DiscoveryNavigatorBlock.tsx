/**
 * Experience Builder wrapper para `vmx.discovery.navigator`.
 *
 * Resuelve el scope territorial (params de ruta + config del bloque),
 * consulta `getDiscoveryNavigator` vía TanStack Query y delega el
 * render al componente presentacional `DiscoveryNavigator`.
 */
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DiscoveryNavigator } from "@/components/discovery/DiscoveryNavigator";
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

  return (
    <DiscoveryNavigator
      title={config.title ?? defaultTitle}
      variant={config.variant ?? "panel"}
      showCounts={config.showCounts ?? true}
      categories={categories}
      ctaLabel={config.ctaLabel ?? "Ver todo el Marketplace"}
      ctaHref={
        config.ctaHref ??
        (destinationSlug ? `/marketplace?destino=${encodeURIComponent(destinationSlug)}` : "/marketplace")
      }
      emptyLabel={config.emptyLabel ?? "Aún no hay categorías publicadas."}
    />
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
      ctaLabel="Ver todo el Marketplace"
      ctaHref="/marketplace?destino=valladolid"
    />
  );
}