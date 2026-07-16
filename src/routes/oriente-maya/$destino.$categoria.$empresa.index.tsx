/**
 * /oriente-maya/{destino}/{categoria}/{empresa} — Identidad canónica
 * territorial de la Empresa (Navigation Blueprint v1.0 · Sub-ola N2.1).
 *
 * Reutiliza `BusinessSurface` (plantilla madre existente). N2.1 sólo
 * cambia URL + breadcrumbs territoriales + canonical self-referencial.
 * Nada de UX profunda ni composición nueva: eso llega en N2.2.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead, localBusinessJsonLd, placeId } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getMarketplaceBusinessBySlug } from "@/lib/catalog/marketplace-reads.functions";
import { getBusinessRelated } from "@/lib/catalog/business-related.functions";
import {
  resolveTerritorialPath,
  resolutionToNavigationContext,
} from "@/lib/navigation/territorial-resolver.functions";
import { navigationContextToDeclaration } from "@/lib/navigation";
import { ContextEngineProvider } from "@/lib/context-engine";
import { BusinessSurface, BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";

export const Route = createFileRoute(
  "/oriente-maya/$destino/$categoria/$empresa/",
)({
  loader: async ({ params }) => {
    const resolution = await resolveTerritorialPath({
      data: {
        destino: params.destino,
        categoria: params.categoria,
        empresa: params.empresa,
      },
    });
    if (resolution.reason !== "ok" || !resolution.business) throw notFound();
    const business = await getMarketplaceBusinessBySlug({
      data: { slug: params.empresa },
    });
    if (!business) throw notFound();
    // E2 · US-E2.1 — Related Collection contextual del negocio.
    // Fallback silencioso: si falla no rompe el render de la ficha.
    let related = null as Awaited<ReturnType<typeof getBusinessRelated>> | null;
    try {
      related = await getBusinessRelated({
        data: {
          businessId: business.id,
          destinationSlug: business.destination_slug,
          categorySlug: business.category_slug,
        },
      });
    } catch {
      related = null;
    }
    return { resolution, business, related };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const b = loaderData.business;
    const destName = loaderData.resolution.destination?.label ?? params.destino;
    const catName = loaderData.resolution.category?.label ?? params.categoria;
    const path = `/oriente-maya/${params.destino}/${params.categoria}/${params.empresa}`;
    const description =
      b.tagline ||
      b.description.slice(0, 300) ||
      `${b.display_name} en ${destName}, Oriente Maya de Yucatán.`;
    return buildPublicHead({
      title: `${b.display_name} · ${destName} — ${SITE.name}`,
      description,
      path,
      ogType: "profile",
      ogImage: b.cover_url ?? undefined,
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Oriente Maya", path: "/oriente-maya" },
        { label: destName, path: `/oriente-maya/${params.destino}` },
        { label: catName, path: `/oriente-maya/${params.destino}/${params.categoria}` },
        { label: b.display_name, path },
      ],
      jsonLd: [
        localBusinessJsonLd({
          name: b.display_name,
          description,
          path,
          image: b.cover_url ?? undefined,
          telephone:
            b.primary_contact?.type === "phone" || b.primary_contact?.type === "whatsapp"
              ? b.primary_contact.value
              : undefined,
          email: b.primary_contact?.type === "email" ? b.primary_contact.value : undefined,
          addressLine:
            b.primary_location?.address_line1 ?? b.address_line1 ?? null,
          addressLocality: destName,
          latitude: b.primary_location?.latitude ?? b.latitude ?? null,
          longitude: b.primary_location?.longitude ?? b.longitude ?? null,
          categorySlug: b.category_slug,
          destinationName: destName,
          areaServed: `${destName}, Yucatán`,
          destinationPlaceId: placeId(`/oriente-maya/${params.destino}`),
        }),
      ],
    });
  },
  component: EmpresaTerritorialPage,
  notFoundComponent: () => (
    <PublicShell title="Empresa no disponible">
      <p className="text-sm text-muted-foreground">
        No publicamos esta empresa en este destino todavía.
      </p>
    </PublicShell>
  ),
});

function EmpresaTerritorialPage() {
  const { resolution, business, related } = Route.useLoaderData();
  const { destino } = Route.useParams();
  const ctx = resolutionToNavigationContext(resolution, destino);
  // N2.2: fuente única = Navigation Contract. El adapter deriva
  // ancestros + hoja desde el contexto ya resuelto; `BusinessSurface`
  // (vía `useContextCrumbs`) renderiza la cadena territorial completa
  // Inicio → Oriente Maya → Destino → Categoría → Empresa.
  const declaration = navigationContextToDeclaration(ctx, {
    currentLabel: business.display_name,
  });

  return (
    <ContextEngineProvider declaration={declaration}>
      <BusinessSurfaceProvider business={business} related={related}>
        <BusinessSurface />
      </BusinessSurfaceProvider>
    </ContextEngineProvider>
  );
}