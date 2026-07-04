/**
 * /marketplace/$slug — Ficha pública SSR de una empresa (Ola 4 · Etapa 1).
 *
 * Lectura read-only vía marketplace-reads.functions.ts. head() emite
 * título/descripción propios y JSON-LD LocalBusiness derivado del loader.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  getMarketplaceBusinessBySlug,
  type MarketplaceBusinessDetail,
} from "@/lib/marketplace/marketplace-reads.functions";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import {
  BusinessSurface,
  BusinessSurfaceProvider,
} from "@/components/surfaces/BusinessSurface";
import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";
import { resolveCanonicalPath } from "@/lib/navigation";
import { DISCOVERY_ORIGIN } from "@/lib/discovery/seo";

/**
 * H-02 · I6 — Declaración de contexto de la ficha de empresa.
 *
 * · `inherit: ["region","destination","category"]` habilita el
 *   enriquecimiento territorial cuando el visitante llega desde una
 *   región, destino o categoría dentro del TTL de `previous`.
 * · `kindDefaults` preserva el breadcrumb legacy en el acceso directo
 *   / deep link (sin `previous`): "Inicio › Marketplace › [Empresa]".
 * · `canonical` = URL de la ficha; la herencia jamás toca SEO.
 */
function buildBusinessContext(b: MarketplaceBusinessDetail): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "business",
      slug: b.slug,
      label: b.display_name,
      href: `/marketplace/${b.slug}`,
    },
    inherit: ["region", "destination", "category"],
    canonical: `/marketplace/${b.slug}`,
    kindDefaults: [
      { kind: "marketplace", label: "Marketplace", href: "/marketplace" },
    ],
  });
}

export const Route = createFileRoute("/marketplace/$slug")({
  loader: async ({ params }) => {
    const business = await getMarketplaceBusinessBySlug({ data: { slug: params.slug } });
    if (!business) throw notFound();
    // US-R3 · Ola 2 · Sub-ola 2.2 — la ficha se sirve desde la
    // Plantilla Madre Business (`__tpl_business__`). Fallback seguro a
    // `<BusinessSurface />` si la composición no existe todavía.
    const composition = await getPublishedCompositionBySlug({
      data: { slug: "__tpl_business__" },
    }).catch(() => null);
    return { business, composition };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const b = loaderData.business;
    const title = `${b.display_name} — ${SITE.name}`;
    const description = b.tagline || b.description.slice(0, 160) || `${b.display_name} en el Marketplace de ${SITE.name}.`;
    const head = buildPublicHead({
      title,
      description,
      path: `/marketplace/${b.slug}`,
      ogType: "website",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: b.display_name,
          description,
          url: `${SITE.url}/marketplace/${b.slug}`,
        },
      ],
    });

    // Sub-ola N2.3 · Fase 1 — Canonicalización territorial.
    // La ruta legacy sigue 200 OK; no se emite 301 en esta fase.
    if (b.destination_slug && b.category_slug) {
      const territorialPath = resolveCanonicalPath({
        kind: "business",
        slug: b.slug,
        category: b.category_slug,
        destination: b.destination_slug,
      });
      const territorialUrl = `${DISCOVERY_ORIGIN}${territorialPath}`;
      for (const link of head.links) {
        if (link.rel === "canonical") link.href = territorialUrl;
      }
      for (const m of head.meta) {
        if (m.property === "og:url") m.content = territorialUrl;
      }
    }
    return head;
  },
  component: MarketplaceBusinessPage,
  errorComponent: ({ error }) => (
    <PublicShell title="Empresa no disponible" crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}>
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell title="Empresa no encontrada" crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}>
      <p className="text-sm text-muted-foreground">No publicamos esa empresa todavía.</p>
    </PublicShell>
  ),
});

function MarketplaceBusinessPage() {
  const { business, composition } = Route.useLoaderData();
  const b: MarketplaceBusinessDetail = business;
  const declaration = buildBusinessContext(b);
  return (
    <ContextEngineProvider declaration={declaration}>
      <BusinessSurfaceProvider business={b}>
        {composition ? (
          <CompositionRenderer tree={composition.snapshot} />
        ) : (
          <BusinessSurface />
        )}
      </BusinessSurfaceProvider>
    </ContextEngineProvider>
  );
}