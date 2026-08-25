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
import {
  BusinessSurface,
  BusinessSurfaceContractBoundary,
  BusinessSurfaceProvider,
} from "@/components/surfaces/BusinessSurface";
import { getOmxdsSurfaceContractsFlag } from "@/lib/omxds/surfaces/surface-contracts-flag.server";
import { getBusinessPremiumEligibility } from "@/lib/omxds/surfaces/business-premium-eligibility.server";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";

export const Route = createFileRoute("/oriente-maya/$destino/$categoria/$empresa/")({
  loader: async ({ params }) => {
    const resolution = await resolveTerritorialPath({
      data: {
        destino: params.destino,
        categoria: params.categoria,
        empresa: params.empresa,
      },
    });
    if (resolution.reason !== "ok" || !resolution.business) throw notFound();
    const [business, specific, template, surfaceContractsEnabled] = await Promise.all([
      getMarketplaceBusinessBySlug({ data: { slug: params.empresa } }),
      // SEO.A3.M1 · Authority Business Landing — composition-first.
      // Se resuelve primero una composición específica por slug
      // (`biz-<slug>`) que permite landings editoriales premium; en su
      // ausencia la ruta cae a la plantilla oficial de negocio y, en
      // último término, al render directo de `BusinessSurface`. Misma
      // arquitectura que Región y Destino — cero excepciones por empresa.
      getPublishedCompositionBySlug({
        data: { slug: `biz-${params.empresa}`, variant_key: params.empresa },
      }).catch(() => null),
      getPublishedCompositionBySlug({
        data: { slug: "__tpl_business__" },
      }).catch(() => null),
      getOmxdsSurfaceContractsFlag().catch(() => false),
    ]);
    if (!business) throw notFound();
    // 19.21 · V1-P1.d — la elegibilidad Premium se evalúa SIEMPRE por ficha
    // (fail-closed dentro del evaluador: published, is_demo_seed=false, grant
    // activo, plan efectivo, procedencia portal, auditoría, ubicación,
    // contacto, SEO y media aprobada). La presentación Premium depende
    // exclusivamente de `premiumEligibility.eligible === true`; el flag global
    // conserva su función para el resto de contratos gobernados.
    const premiumEligibility = await getBusinessPremiumEligibility({
      data: { businessId: business.id },
    }).catch(() => null);
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
    const composition = specific ?? template ?? null;
    return {
      resolution,
      business,
      related,
      composition,
      surfaceContractsEnabled,
      premiumEligibility,
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const b = loaderData.business;
    const premium = loaderData.premiumEligibility?.eligible ? loaderData.premiumEligibility : null;
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
      ogImage: premium?.cover?.url ?? b.cover_url ?? undefined,
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
          image: premium?.cover?.url ?? b.cover_url ?? undefined,
          telephone:
            (premium?.contact ?? b.primary_contact)?.type === "phone" ||
            (premium?.contact ?? b.primary_contact)?.type === "whatsapp"
              ? (premium?.contact ?? b.primary_contact)?.value
              : undefined,
          email:
            (premium?.contact ?? b.primary_contact)?.type === "email"
              ? (premium?.contact ?? b.primary_contact)?.value
              : undefined,
          addressLine:
            premium?.location?.addressLine1 ??
            b.primary_location?.address_line1 ??
            b.address_line1 ??
            null,
          addressLocality: destName,
          latitude:
            premium?.location?.latitude ?? b.primary_location?.latitude ?? b.latitude ?? null,
          longitude:
            premium?.location?.longitude ?? b.primary_location?.longitude ?? b.longitude ?? null,
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
  const {
    resolution,
    business,
    related,
    composition,
    surfaceContractsEnabled,
    premiumEligibility,
  } = Route.useLoaderData();
  const { destino } = Route.useParams();
  const ctx = resolutionToNavigationContext(resolution, destino);
  // N2.2: fuente única = Navigation Contract. El adapter deriva
  // ancestros + hoja desde el contexto ya resuelto; `BusinessSurface`
  // (vía `useContextCrumbs`) renderiza la cadena territorial completa
  // Inicio → Oriente Maya → Destino → Categoría → Empresa.
  const declaration = navigationContextToDeclaration(ctx, {
    currentLabel: business.display_name,
  });

  // 19.21 · V1-P1.d — la presentación Premium depende exclusivamente de la
  // elegibilidad efectiva por ficha. El flag global sigue gobernando el resto
  // de contratos: con el flag OFF y ficha no elegible, el render es el legado.
  const premiumEnabled = premiumEligibility?.eligible === true;

  return (
    <ContextEngineProvider declaration={declaration}>
      <BusinessSurfaceProvider business={business} related={related}>
        <BusinessSurfaceContractBoundary
          enabled={surfaceContractsEnabled || premiumEnabled}
          business={business}
          related={related}
          premiumEligibility={premiumEnabled ? premiumEligibility : null}
          legacy={
            composition ? <CompositionRenderer tree={composition.snapshot} /> : <BusinessSurface />
          }
        />
      </BusinessSurfaceProvider>
    </ContextEngineProvider>
  );
}
