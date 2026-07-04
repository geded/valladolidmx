/**
 * ProductSurface — Plantilla Madre de Producto (US-R3 · Sub-ola 2.3a).
 *
 * Superficie propia (NO reciclada de `BusinessProductsBlock`, que es un
 * bloque de LISTADO dentro de una empresa). Aquí renderizamos la ficha
 * individual de un producto, editable por bloques `vmx.product.*` desde
 * el Experience Builder. En producción y en Studio se inyecta el
 * detalle vía `ProductSurfaceProvider`; los bloques leen del contexto.
 */
import { createContext, useContext } from "react";
import { PublicShell } from "@/components/discovery";
import type { MarketplaceProductDetail } from "@/lib/marketplace/marketplace-reads.functions";

export const ProductSurfaceContext = createContext<MarketplaceProductDetail | null>(null);

export function useProduct(): MarketplaceProductDetail | null {
  return useContext(ProductSurfaceContext);
}

export function ProductSurfaceProvider({
  product,
  children,
}: {
  product: MarketplaceProductDetail | null;
  children: React.ReactNode;
}) {
  return (
    <ProductSurfaceContext.Provider value={product}>
      {children}
    </ProductSurfaceContext.Provider>
  );
}

/**
 * Fallback monolítico usado por la ruta pública cuando la composición
 * `__tpl_product__` no está publicada (contingencia). No se registra en
 * el Studio ni compite con los bloques granulares.
 */
export function ProductSurface({
  product: propProduct,
}: {
  product?: MarketplaceProductDetail | null;
} = {}) {
  const ctxProduct = useContext(ProductSurfaceContext);
  const p = propProduct ?? ctxProduct;
  if (!p) {
    return (
      <PublicShell
        title="Producto no disponible"
        crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
      >
        <p className="text-sm text-muted-foreground">
          Aún no publicamos esta ficha.
        </p>
      </PublicShell>
    );
  }
  return (
    <PublicShell
      eyebrow={p.product_type}
      title={p.name}
      description={p.tagline}
      crumbs={[
        { label: "Marketplace", to: "/marketplace" },
        { label: p.business.display_name, to: `/marketplace/${p.business.slug}` },
        { label: p.name },
      ]}
      useContextCrumbs
    >
      {p.description ? (
        <p className="max-w-3xl text-sm text-foreground/80">{p.description}</p>
      ) : null}
    </PublicShell>
  );
}