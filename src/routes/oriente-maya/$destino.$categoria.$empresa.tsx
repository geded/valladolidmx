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
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getMarketplaceBusinessBySlug } from "@/lib/marketplace/marketplace-reads.functions";
import {
  resolveTerritorialPath,
  resolutionToNavigationContext,
} from "@/lib/navigation/territorial-resolver.functions";
import { buildBreadcrumbs } from "@/lib/navigation";
import {
  ContextEngineProvider,
  defineRouteContext,
} from "@/lib/context-engine";
import { BusinessSurface, BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";

export const Route = createFileRoute(
  "/oriente-maya/$destino/$categoria/$empresa",
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
    return { resolution, business };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const b = loaderData.business;
    return buildPublicHead({
      title: `${b.display_name} · ${loaderData.resolution.destination?.label ?? params.destino} — ${SITE.name}`,
      description:
        b.tagline ||
        b.description.slice(0, 160) ||
        `${b.display_name} en ${loaderData.resolution.destination?.label ?? params.destino}, Oriente Maya de Yucatán.`,
      path: `/oriente-maya/${params.destino}/${params.categoria}/${params.empresa}`,
      ogType: "profile",
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
  const { resolution, business } = Route.useLoaderData();
  const { destino, categoria, empresa } = Route.useParams();
  const ctx = resolutionToNavigationContext(resolution, destino);
  const crumbs = buildBreadcrumbs(ctx);

  // ContextEngine para consumidores actuales (breadcrumbs contextuales,
  // Alux, related). Registra ancestros territoriales completos.
  const declaration = defineRouteContext({
    current: {
      kind: "business",
      slug: empresa,
      label: business.display_name,
      href: `/oriente-maya/${destino}/${categoria}/${empresa}`,
    },
    ancestors: [
      { kind: "region", slug: "oriente-maya", label: "Oriente Maya", href: "/oriente-maya" },
      {
        kind: "destination",
        slug: destino,
        label: resolution.destination?.label ?? destino,
        href: `/oriente-maya/${destino}`,
      },
      {
        kind: "category",
        slug: categoria,
        label: resolution.category?.label ?? categoria,
        href: `/oriente-maya/${destino}/${categoria}`,
      },
    ],
    canonical: `/oriente-maya/${destino}/${categoria}/${empresa}`,
  });

  return (
    <ContextEngineProvider declaration={declaration}>
      <BusinessSurfaceProvider business={business}>
        <BusinessSurface
          crumbsOverride={crumbs.map((c) => ({ label: c.label, to: c.href }))}
        />
      </BusinessSurfaceProvider>
    </ContextEngineProvider>
  );
}