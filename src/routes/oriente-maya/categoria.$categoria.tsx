/**
 * Listado regional por categoría de empresas —
 * `/oriente-maya/categoria/:categoria`.
 *
 * Usa la ÚNICA plantilla Premium territorial aprobada
 * (`ListingPremiumSurfaceFromDTO` → `TerritorialListingReviewSurface`),
 * la misma de Hoteles. No crea superficie, tarjeta ni estética nueva.
 * Alcance: toda la región Oriente Maya, con filtro por destino real del CMS.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import type { FacetDef } from "@/components/surfaces/TourismListingSurface";
import {
  getPublicBusinessCategoryListing,
  resolvePublicBusinessCategory,
} from "@/lib/listings/listing-public-reads.functions";

export const Route = createFileRoute("/oriente-maya/categoria/$categoria")({
  loader: async ({ params }) => {
    const category = await resolvePublicBusinessCategory({
      data: { categorySlug: params.categoria },
    }).catch(() => null);
    if (!category) throw notFound();
    const dto = await getPublicBusinessCategoryListing({
      data: { categorySlug: category.slug, categoryLabel: category.label, destino: null },
    });
    return { category, dto };
  },
  head: ({ loaderData, params }) => {
    const label = loaderData?.category.label ?? params.categoria;
    return buildPublicHead({
      title: `${label} del Oriente Maya · ${SITE.name}`,
      description: `Empresas de ${label.toLowerCase()} publicadas en los destinos del Oriente Maya de Yucatán.`,
      path: `/oriente-maya/categoria/${params.categoria}`,
    });
  },
  component: CategoriaRegionalPage,
});

function CategoriaRegionalPage() {
  const { category, dto } = Route.useLoaderData();
  const label = category.label;

  // Filtro regional real: destinos presentes en los resultados publicados.
  const destinationOptions = Array.from(
    new Set(dto.items.map((item) => item.location?.label).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const facets: FacetDef[] =
    destinationOptions.length > 1
      ? [
          {
            id: "destino",
            label: "Destino",
            options: destinationOptions.map((value) => ({ value, label: value })),
            extract: (vm) => vm.location?.label ?? null,
          },
        ]
      : [];

  return (
    <PublicShell
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label },
      ]}
      compactCrumbsOnMobile
    >
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        facets={facets}
        showAddToTrip
        showFavorite
        profileOverride={{
          breadcrumb: label,
          resultsTitle: `${label} del Oriente Maya`,
          itemLabel: label.toLowerCase(),
          searchPlaceholder: `Buscar ${label.toLowerCase()} por nombre o destino`,
          nearbyTitle: `Más ${label.toLowerCase()} en la región`,
          mapTitle: `${label} en el mapa del Oriente Maya`,
          filters: ["Destino", "Tipo", "Etiquetas"],
        }}
      />
    </PublicShell>
  );
}
