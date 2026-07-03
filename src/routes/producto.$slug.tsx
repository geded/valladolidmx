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

    return buildPublicHead({
      title,
      description,
      path: `/producto/${p.slug}`,
      ogType: "product",
      ogImage: cover,
      jsonLd: [jsonLd],
    });
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
  return (
    <ProductSurfaceProvider product={product}>
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <ProductSurface />
      )}
    </ProductSurfaceProvider>
  );
}