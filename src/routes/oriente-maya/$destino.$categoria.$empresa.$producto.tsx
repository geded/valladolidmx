/**
 * /oriente-maya/{destino}/{categoria}/{empresa}/{producto} — Identidad
 * canónica territorial del Producto (Navigation Blueprint v1.0 · N2.1).
 *
 * Reutiliza `ProductSurface` (plantilla madre existente). N2.1 sólo
 * cambia URL + breadcrumbs territoriales + canonical self-referencial.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getMarketplaceProductBySlug } from "@/lib/marketplace/marketplace-reads.functions";
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
    return { resolution, product };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const p = loaderData.product;
    const path = `/oriente-maya/${params.destino}/${params.categoria}/${params.empresa}/${params.producto}`;
    return buildPublicHead({
      title: `${p.name} · ${p.business.display_name} — ${SITE.name}`,
      description:
        p.tagline ||
        p.description.slice(0, 160) ||
        `${p.name} en ${p.business.display_name}, Oriente Maya de Yucatán.`,
      path,
      ogType: "product",
      ogImage: p.cover_url ?? undefined,
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
  const { resolution, product } = Route.useLoaderData();
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
      <ProductSurfaceProvider product={product}>
        <ProductSurface />
      </ProductSurfaceProvider>
    </ContextEngineProvider>
  );
}