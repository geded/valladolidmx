/**
 * /producto/$slug — Ficha pública SSR de un producto (US-R3 · Sub-ola 2.3a).
 *
 * Lectura read-only vía `getMarketplaceProductBySlug`. `head()` emite
 * título, descripción, canonical, og:image (portada) y JSON-LD
 * Product completo (image, offers.price, offers.availability, brand
 * derivada de la empresa oferente).
 *
 * La ruta carga además la Plantilla Madre `__tpl_product__` publicada.
 * Si por cualquier razón la composición no existe, cae al fallback
 * `<ProductSurface />` monolítico — el usuario NUNCA ve pantalla vacía.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  getMarketplaceProductBySlug,
  type MarketplaceProductDetail,
} from "@/lib/marketplace/marketplace-reads.functions";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import {
  ProductSurface,
  ProductSurfaceProvider,
} from "@/components/surfaces/ProductSurface";
import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";
import { resolveCanonicalPath } from "@/lib/navigation";
import { DISCOVERY_ORIGIN } from "@/lib/discovery/seo";

/**
 * H-02 · I6 — Declaración de contexto de la ficha de producto.
 *
 * · `inherit: ["region","destination","category"]` enriquece el
 *   breadcrumb cuando el usuario llega desde una categoría o destino.
 * · `kindDefaults` preserva el breadcrumb legacy en el acceso directo:
 *   "Inicio › Marketplace › [Empresa] › [Producto]".
 * · `canonical` = URL del producto; la herencia jamás toca SEO.
 */
function buildProductContext(p: MarketplaceProductDetail): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "product",
      slug: p.slug,
      label: p.name,
      href: `/producto/${p.slug}`,
    },
    inherit: ["region", "destination", "category"],
    canonical: `/producto/${p.slug}`,
    kindDefaults: [
      { kind: "marketplace", label: "Marketplace", href: "/marketplace" },
      {
        kind: "business",
        slug: p.business.slug,
        label: p.business.display_name,
        href: `/marketplace/${p.business.slug}`,
      },
    ],
  });
}

export const Route = createFileRoute("/producto/$slug")({
  loader: async ({ params }) => {
    const product = await getMarketplaceProductBySlug({ data: { slug: params.slug } });
    if (!product) throw notFound();
    const composition = await getPublishedCompositionBySlug({
      data: { slug: "__tpl_product__" },
    }).catch(() => null);
    return { product, composition };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const p: MarketplaceProductDetail = loaderData.product;
    const title = `${p.name} · ${p.business.display_name} — ${SITE.name}`;
    const description =
      p.tagline || p.description.slice(0, 160) ||
      `${p.name} en ${p.business.display_name}, publicado en ${SITE.name}.`;
    const cover = p.cover_url ?? undefined;
    const offers: Record<string, unknown> = {
      "@type": "Offer",
      priceCurrency: p.price_currency || "MXN",
      availability: p.requires_availability
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock",
      url: `${SITE.url}/producto/${p.slug}`,
    };
    if (p.price_amount !== null) offers.price = Number(p.price_amount);

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description,
      sku: p.slug,
      url: `${SITE.url}/producto/${p.slug}`,
      brand: {
        "@type": "Organization",
        name: p.business.display_name,
        url: `${SITE.url}/marketplace/${p.business.slug}`,
      },
      offers,
    };
    if (cover) jsonLd.image = cover;
    if (p.reviews.length > 0) {
      const avg =
        p.reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / p.reviews.length;
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.round(avg * 10) / 10,
        reviewCount: p.reviews.length,
      };
    }

    const head = buildPublicHead({
      title,
      description,
      path: `/producto/${p.slug}`,
      ogType: "product",
      ogImage: cover,
      jsonLd: [jsonLd],
    });

    // Sub-ola N2.3 · Fase 1 — Canonicalización territorial.
    // Cuando la empresa oferente tiene destino y categoría publicados,
    // el canonical y el `og:url` apuntan a la URL territorial oficial.
    // La ruta legacy sigue 200 OK; NO se emite ningún 301 en esta fase.
    const destSlug = p.business.destination_slug;
    const catSlug = p.business.category_slug;
    if (destSlug && catSlug) {
      const territorialPath = resolveCanonicalPath({
        kind: "product",
        slug: p.slug,
        business: p.business.slug,
        category: catSlug,
        destination: destSlug,
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
  component: MarketplaceProductPage,
  errorComponent: ({ error }) => (
    <PublicShell
      title="Producto no disponible"
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell
      title="Producto no encontrado"
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">No publicamos ese producto todavía.</p>
    </PublicShell>
  ),
});

function MarketplaceProductPage() {
  const { product, composition } = Route.useLoaderData();
  const declaration = buildProductContext(product);
  return (
    <ContextEngineProvider declaration={declaration}>
      <ProductSurfaceProvider product={product}>
        {composition ? (
          <CompositionRenderer tree={composition.snapshot} />
        ) : (
          <ProductSurface />
        )}
      </ProductSurfaceProvider>
    </ContextEngineProvider>
  );
}