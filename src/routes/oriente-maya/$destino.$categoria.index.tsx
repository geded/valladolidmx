/**
 * /oriente-maya/{destino}/{categoria} — Ficha territorial de Categoría
 * en Destino (Navigation Blueprint v1.0 · Sub-ola N2.1).
 *
 * Sub-ola N2.1 · alcance intencional:
 *  - Rutas base con resolver territorial + canonical self-referencial.
 *  - Breadcrumbs y `head()` completos vía Navigation Contract (N1).
 *  - Superficie mínima coherente (listado editorial de empresas).
 *  - No se toca aún UX profunda ni composición de EB — llega en N2.2.
 *  - No se activan redirects 301 (Fase 2 de N2.3, previa validación).
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PublicShell } from "@/components/discovery";
import { BusinessQuickViewDialog } from "@/components/discovery/BusinessQuickViewDialog";
import { buildPublicHead, collectionPageJsonLd } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  resolveTerritorialPath,
  resolutionToNavigationContext,
} from "@/lib/navigation/territorial-resolver.functions";
import {
  buildBreadcrumbs,
  navigationContextToDeclaration,
} from "@/lib/navigation";
import { ContextEngineProvider } from "@/lib/context-engine";
import {
  listMarketplaceBusinesses,
  type MarketplaceBusinessCard,
} from "@/lib/catalog/marketplace-reads.functions";
import { getCategoryRelated } from "@/lib/catalog/category-related.functions";
import {
  CategorySurfaceRelatedProvider,
  type CategorySurfaceRelatedValue,
} from "@/components/surfaces/CategorySurface";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { TourismListingSurface } from "@/components/surfaces/TourismListingSurface";
import { businessToTourismCard } from "@/lib/experience-builder/adapters/tourism-listing-adapters";
import { businessToMapPoint } from "@/lib/experience-builder/adapters/entity-to-map-point";
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";
import { ListingMapHeader } from "@/components/discovery/ListingMapHeader";

export const Route = createFileRoute("/oriente-maya/$destino/$categoria/")({
  loader: async ({ params }) => {
    const resolution = await resolveTerritorialPath({
      data: { destino: params.destino, categoria: params.categoria },
    });
    if (
      resolution.reason === "destination_not_found" ||
      resolution.reason === "category_not_found"
    ) {
      throw notFound();
    }
    // Listado de empresas por dest+cat (filtrado defensivo cliente,
    // fuente única de verdad ya validada por el resolver).
    const businesses = await listMarketplaceBusinesses().catch(
      () => [] as MarketplaceBusinessCard[],
    );
    const items: MarketplaceBusinessCard[] = businesses.filter(
      (b: MarketplaceBusinessCard) =>
        b.destination_slug === params.destino &&
        b.category_slug === params.categoria,
    );
    // E2 · US-E2.3 — Related Collection para superficie Categoría.
    // Fallback silencioso: el bloque se oculta si no hay datos.
    const related = await getCategoryRelated({
      data: {
        destinationSlug: params.destino,
        categorySlug: params.categoria,
      },
    }).catch(() => null);
    return { resolution, items, related };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const { resolution } = loaderData;
    const dest = resolution.destination?.label ?? params.destino;
    const cat = resolution.category?.label ?? params.categoria;
    const path = `/oriente-maya/${params.destino}/${params.categoria}`;
    const items = (loaderData.items ?? []).map((b) => ({
      name: b.display_name,
      path: `/oriente-maya/${params.destino}/${params.categoria}/${b.slug}`,
    }));
    return buildPublicHead({
      title: `${cat} en ${dest} — Oriente Maya · ${SITE.name}`,
      description: `Descubre ${cat.toLowerCase()} en ${dest}, Oriente Maya de Yucatán. Selección editorial de ${SITE.name}.`,
      path,
      ogType: "website",
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Oriente Maya", path: "/oriente-maya" },
        { label: dest, path: `/oriente-maya/${params.destino}` },
        { label: cat, path },
      ],
      jsonLd: [
        collectionPageJsonLd({
          name: `${cat} en ${dest}`,
          description: `Selección editorial de ${cat.toLowerCase()} en ${dest}, Oriente Maya de Yucatán.`,
          path,
          items,
        }),
      ],
    });
  },
  component: CategoriaEnDestinoPage,
  notFoundComponent: () => (
    <PublicShell
      title="Categoría no disponible"
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label: "—" },
      ]}
    >
      <p className="text-sm text-muted-foreground">
        Aún no publicamos esta categoría en este destino.
      </p>
    </PublicShell>
  ),
});

function CategoriaEnDestinoPage() {
  const { resolution, items, related } = Route.useLoaderData();
  const { destino, categoria } = Route.useParams();
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const ctx = resolutionToNavigationContext(resolution, destino);
  // `BreadcrumbTerritorial` renderiza el ícono/Home por sí mismo, así
  // que evitamos duplicarlo pidiéndole a `buildBreadcrumbs` que lo omita.
  const crumbs = buildBreadcrumbs(ctx, { includeHome: false }).map((c) => ({
    label: c.label,
    to: c.href,
  }));
  const destLabel = resolution.destination?.label ?? destino;
  const catLabel = resolution.category?.label ?? categoria;

  // Etiqueta contextual del CTA primario en cada tarjeta.
  const primaryCtaLabel = (() => {
    const c = catLabel.toLowerCase();
    if (c.includes("hotel") || c.includes("hosped")) return "Ver hotel";
    if (c.includes("restaur")) return "Ver restaurante";
    if (c.includes("experi")) return "Ver experiencia";
    if (c.includes("casa")) return "Ver alojamiento";
    return `Ver ${c || "empresa"}`;
  })();
  const declaration = navigationContextToDeclaration(ctx);
  const categoryValue: CategorySurfaceRelatedValue = {
    destinationSlug: destino,
    categorySlug: categoria,
    destinationLabel: destLabel,
    categoryLabel: catLabel,
    related,
  };
  const hasRelated = Boolean(
    related &&
      (related.otherCategoriesInDestination.length > 0 ||
        related.sameCategoryOtherDestinations.length > 0),
  );

  // Puntos del mapa (Founder Discovery: mapa arriba + tarjetas abajo).
  const mapPoints = useMemo<ExperienceMapPoint[]>(() => {
    const arr: (ExperienceMapPoint | null)[] = items
      .map((b: MarketplaceBusinessCard) => {
        const point = businessToMapPoint({
          id: b.id,
          name: b.display_name,
          slug: b.slug,
          latitude: b.latitude ?? null,
          longitude: b.longitude ?? null,
          address_line1: b.address_line1 ?? null,
          cover_url: b.cover_url ?? null,
          category_label: catLabel,
        });
        // Interceptamos href para abrir el modal (no navegar).
        return point ? { ...point, href: null } : null;
      });
    return arr.filter((p): p is ExperienceMapPoint => p !== null);
  }, [items, catLabel]);

  // Intercepta clicks a la ficha completa y abre el modal en su lugar.
  const handleListingClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    const prefix = `/oriente-maya/${destino}/${categoria}/`;
    if (!href.startsWith(prefix)) return;
    // Extrae el slug de empresa (segmento tras el prefijo).
    const rest = href.slice(prefix.length).split("/")[0];
    if (!rest) return;
    e.preventDefault();
    setQuickViewSlug(rest);
  };

  return (
    <ContextEngineProvider declaration={declaration}>
    <CategorySurfaceRelatedProvider value={categoryValue}>
    <PublicShell crumbs={crumbs}>
      <div onClick={handleListingClick}>
      <TourismListingSurface
        hero={{
          eyebrow: destLabel,
          title: `${catLabel} en ${destLabel}`,
          subtitle: `Selección editorial de ${catLabel.toLowerCase()} en ${destLabel}, Oriente Maya de Yucatán.`,
          metaLabel: destLabel,
        }}
        items={items.map((b: MarketplaceBusinessCard) => {
          const vm = businessToTourismCard(b, {
            destinationLabel: destLabel,
            regionLabel: "Oriente Maya",
            forcedCategorySlug: categoria,
          });
          const pointIndex = mapPoints.findIndex((p) => p.id === b.id);
          // Inyectamos CTA primario: abre el modal (interceptado por
          // handleListingClick porque el href apunta a la ficha completa).
          return {
            ...vm,
            mapLabel:
              pointIndex >= 0
                ? String.fromCharCode(65 + (pointIndex % 26))
                : null,
            primaryAction: vm.href
              ? { label: primaryCtaLabel, href: vm.href }
              : null,
          };
        })}
        destinationSlug={destino}
        destinationLabel={destLabel}
        mapSlot={
          mapPoints.length > 0 ? (
            <ListingMapHeader
              heading={`${catLabel} en el mapa de ${destLabel}`}
              points={mapPoints}
            />
          ) : null
        }
        emptyMessage={`Aún no publicamos empresas de ${catLabel.toLowerCase()} en ${destLabel}.`}
      />
      </div>
      {hasRelated ? (
        <section id="descubre" className="mt-12">
          <ExperienceRelatedCollectionBlock
            config={{
              source: "category",
              entityKind: "business",
              variant: "grid",
              columns: 3,
              heading: "Sigue descubriendo",
              subheading: `Más ideas para tu viaje por ${destLabel} y el Oriente Maya.`,
              capabilities: {
                showRationale: true,
                showKindBadge: false,
              },
              groups: [
                {
                  id: "otras-categorias-destino",
                  entityKind: "business",
                  heading: `Otras categorías en ${destLabel}`,
                  items: [],
                },
                {
                  id: "misma-categoria-otros-destinos",
                  entityKind: "business",
                  heading: `${catLabel} en otros destinos del Oriente Maya`,
                  items: [],
                },
              ],
            }}
          />
        </section>
      ) : null}
      <BusinessQuickViewDialog
        slug={quickViewSlug}
        destinoSlug={destino}
        categoriaSlug={categoria}
        onClose={() => setQuickViewSlug(null)}
      />
    </PublicShell>
    </CategorySurfaceRelatedProvider>
    </ContextEngineProvider>
  );
}