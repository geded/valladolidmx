/**
 * /oriente-maya/{destino}/{categoria}/{empresa}/{producto} — Identidad
 * canónica territorial del Producto (Navigation Blueprint v1.0 · N2.1).
 *
 * Reutiliza `ProductSurface` (plantilla madre existente). N2.1 sólo
 * cambia URL + breadcrumbs territoriales + canonical self-referencial.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead, productJsonLd, faqPageJsonLd } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getMarketplaceProductBySlug } from "@/lib/catalog/marketplace-reads.functions";
import { getProductRelated } from "@/lib/catalog/product-related.functions";
import {
  resolveTerritorialPath,
  resolutionToNavigationContext,
} from "@/lib/navigation/territorial-resolver.functions";
import { navigationContextToDeclaration } from "@/lib/navigation";
import { ContextEngineProvider } from "@/lib/context-engine";
import {
  ProductSurface,
  ProductSurfaceProvider,
} from "@/components/surfaces/ProductSurface";

export const Route = createFileRoute(
  "/oriente-maya/$destino/$categoria/$empresa/$producto",
)({
  loader: async ({ params }) => {
    const resolution = await resolveTerritorialPath({
      data: {
        destino: params.destino,
        categoria: params.categoria,
        empresa: params.empresa,
        producto: params.producto,
      },
    });
    if (resolution.reason !== "ok" || !resolution.product) throw notFound();
    const product = await getMarketplaceProductBySlug({
      data: { slug: params.producto },
    });
    if (!product) throw notFound();
    // E2 · US-E2.2 — Related Collection contextual del producto.
    // Fallback silencioso: no debe romper el render de la ficha.
    let related = null as Awaited<ReturnType<typeof getProductRelated>> | null;
    try {
      related = await getProductRelated({
        data: {
          productId: product.id,
          businessId: product.business.id,
          destinationSlug: product.business.destination_slug,
          categorySlug: product.business.category_slug,
        },
      });
    } catch {
      related = null;
    }
    return { resolution, product, related };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const p = loaderData.product;
    const destName = loaderData.resolution.destination?.label ?? params.destino;
    const catName = loaderData.resolution.category?.label ?? params.categoria;
    const path = `/oriente-maya/${params.destino}/${params.categoria}/${params.empresa}/${params.producto}`;
    const description =
      p.tagline ||
      p.description.slice(0, 300) ||
      `${p.name} en ${p.business.display_name}, Oriente Maya de Yucatán.`;
    const jsonLd: Record<string, unknown>[] = [
      productJsonLd({
        name: p.name,
        description,
        path,
        image: p.cover_url ?? p.media?.[0]?.url ?? undefined,
        sku: p.slug,
        brandName: p.business.display_name,
        priceAmount: p.price_amount,
        priceCurrency: p.price_currency,
        availability: "InStock",
        aggregateRating:
          p.review_stats && p.review_stats.count > 0
            ? {
                ratingValue: Number(p.review_stats.average.toFixed(2)),
                reviewCount: p.review_stats.count,
              }
            : undefined,
      }),
    ];
    if (p.faqs && p.faqs.length > 0) {
      jsonLd.push(faqPageJsonLd(p.faqs.map((f) => ({ question: f.question, answer: f.answer }))));
    }
    return buildPublicHead({
      title: `${p.name} · ${p.business.display_name} — ${SITE.name}`,
      description,
      path,
      ogType: "product",
      ogImage: p.cover_url ?? undefined,
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Oriente Maya", path: "/oriente-maya" },
        { label: destName, path: `/oriente-maya/${params.destino}` },
        { label: catName, path: `/oriente-maya/${params.destino}/${params.categoria}` },
        { label: p.business.display_name, path: `/oriente-maya/${params.destino}/${params.categoria}/${params.empresa}` },
        { label: p.name, path },
      ],
      jsonLd,
    });
  },
  component: ProductoTerritorialPage,
  notFoundComponent: () => (
    <PublicShell title="Producto no disponible">
      <p className="text-sm text-muted-foreground">
        No publicamos ese producto en esta empresa todavía.
      </p>
    </PublicShell>
  ),
});

function ProductoTerritorialPage() {
  const { resolution, product, related } = Route.useLoaderData();
  const { destino } = Route.useParams();
  const ctx = resolutionToNavigationContext(resolution, destino);
  // N2.2: fuente única = Navigation Contract. El adapter deriva
  // ancestros + hoja desde el contexto ya resuelto; `ProductSurface`
  // (vía `useContextCrumbs`) renderiza la cadena territorial completa
  // Inicio → Oriente Maya → Destino → Categoría → Empresa → Producto.
  const declaration = navigationContextToDeclaration(ctx, {
    currentLabel: product.name,
  });

  return (
    <ContextEngineProvider declaration={declaration}>
      <ProductSurfaceProvider product={product} related={related}>
        <ProductSurface />
      </ProductSurfaceProvider>
    </ContextEngineProvider>
  );
}