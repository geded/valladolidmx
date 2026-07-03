/**
 * /portal/productos/$productId/preview — Sub-ola 2.4a · Fase C.
 *
 * Preview autenticado de un producto (draft/in_review/published) para
 * el equipo dueño de la empresa. Reutiliza exactamente el mismo motor
 * que producción:
 *   1. `ProductSurfaceProvider` inyecta el detalle en contexto.
 *   2. Composición `__tpl_product__` se renderiza con
 *      `CompositionRenderer` — mismos bloques `vmx.product.*` que en
 *      `/producto/$slug`, sin ramas alternativas.
 *   3. Si no existe composición publicada cae al fallback monolítico
 *      `<ProductSurface />` — cero pantallas vacías.
 *
 * No se registra en el preview-registry (que sirve al Studio Founder);
 * este preview es específicamente del Portal Empresarial.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalProductPreview } from "@/lib/portal/portal-product-publish.functions";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import {
  ProductSurface,
  ProductSurfaceProvider,
} from "@/components/surfaces/ProductSurface";

export const Route = createFileRoute(
  "/_authenticated/portal/productos/$productId/preview",
)({
  head: () => ({
    meta: [
      { title: "Vista previa · Portal Empresarial" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalProductPreview,
});

function PortalProductPreview() {
  const { productId } = Route.useParams();
  const previewFn = useServerFn(getPortalProductPreview);
  const compositionFn = useServerFn(getPublishedCompositionBySlug);

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "product-preview", productId],
    queryFn: async () => {
      const [product, composition] = await Promise.all([
        previewFn({ data: { productId } }),
        compositionFn({ data: { slug: "__tpl_product__" } }).catch(() => null),
      ]);
      return { product, composition };
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Cargando vista previa…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-sm text-destructive">
        {error instanceof Error ? error.message : "Error"}
      </div>
    );
  }
  if (!data?.product) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Producto no encontrado.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-amber-500/10 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-amber-800 dark:text-amber-200">
        <span>Vista previa privada — sólo visible para tu equipo</span>
        <a
          href="/portal/catalogo"
          className="rounded border border-amber-600/40 px-2 py-0.5 hover:bg-amber-500/20"
        >
          Volver al catálogo
        </a>
      </div>
      <ProductSurfaceProvider product={data.product}>
        {data.composition ? (
          <CompositionRenderer tree={data.composition.snapshot} />
        ) : (
          <ProductSurface />
        )}
      </ProductSurfaceProvider>
    </div>
  );
}