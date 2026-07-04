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
import type { ProductRelatedDTO } from "@/lib/marketplace/product-related.functions";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";

export const ProductSurfaceContext = createContext<MarketplaceProductDetail | null>(null);

export function useProduct(): MarketplaceProductDetail | null {
  return useContext(ProductSurfaceContext);
}

/**
 * E2 · US-E2.2 — Contexto complementario para Related Collection.
 * Se mantiene independiente para no romper consumidores existentes
 * de `ProductSurfaceContext`.
 */
export const ProductSurfaceRelatedContext =
  createContext<ProductRelatedDTO | null>(null);

export function ProductSurfaceProvider({
  product,
  related,
  children,
}: {
  product: MarketplaceProductDetail | null;
  related?: ProductRelatedDTO | null;
  children: React.ReactNode;
}) {
  return (
    <ProductSurfaceContext.Provider value={product}>
      <ProductSurfaceRelatedContext.Provider value={related ?? null}>
        {children}
      </ProductSurfaceRelatedContext.Provider>
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
  const related = useContext(ProductSurfaceRelatedContext);
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

  const hasSameBusiness = (p.related?.length ?? 0) > 0;
  const hasSameCatDest = (related?.sameCategoryInDestination.length ?? 0) > 0;
  const hasOtherDest = (related?.otherInDestination.length ?? 0) > 0;
  const showDescubre = hasSameBusiness || hasSameCatDest || hasOtherDest;

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

      {showDescubre ? (
        <section id="descubre" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceRelatedCollectionBlock
            config={{
              source: "product",
              entityKind: "product",
              variant: "grid",
              columns: 2,
              heading: "Sigue descubriendo",
              subheading: `Más opciones desde ${p.business.display_name} y otras experiencias en el mismo destino.`,
              emptyMessage: "Aún no hay productos hermanos publicados.",
              ariaLabel: `Descubrimiento contextual desde ${p.name}`,
              groups: [
                {
                  id: "misma-empresa",
                  entityKind: "product",
                  heading: `Más de ${p.business.display_name}`,
                  maxItems: 6,
                  variant: "grid",
                  seeAllHref:
                    p.business.destination_slug && p.business.category_slug
                      ? `/oriente-maya/${encodeURIComponent(p.business.destination_slug)}/${encodeURIComponent(p.business.category_slug)}/${encodeURIComponent(p.business.slug)}`
                      : `/marketplace/${p.business.slug}`,
                  seeAllLabel: "Ver empresa",
                },
                {
                  id: "misma-categoria-destino",
                  entityKind: "product",
                  heading: p.business.category_slug
                    ? `Otras opciones de ${p.business.category_slug} en el destino`
                    : "Otras opciones en el destino",
                  maxItems: 6,
                  variant: "grid",
                  seeAllHref:
                    p.business.destination_slug && p.business.category_slug
                      ? `/oriente-maya/${encodeURIComponent(p.business.destination_slug)}/${encodeURIComponent(p.business.category_slug)}`
                      : `/oriente-maya/${encodeURIComponent(p.business.destination_slug || "")}`,
                  seeAllLabel: "Ver categoría",
                },
                {
                  id: "otros-en-destino",
                  entityKind: "product",
                  heading: "Otras experiencias del destino",
                  maxItems: 6,
                  variant: "grid",
                  seeAllHref: `/oriente-maya/${encodeURIComponent(p.business.destination_slug || "")}`,
                  seeAllLabel: "Ver destino",
                },
              ],
              capabilities: {
                showImage: true,
                showMeta: true,
                showBadges: true,
                showPrice: true,
                showKindBadge: true,
                dedupe: true,
                showRationale: true,
              },
              contextRefs: {
                destinationSlug: p.business.destination_slug || null,
                categorySlug: p.business.category_slug || null,
                businessSlug: p.business.slug || null,
                productSlug: p.slug || null,
              },
            }}
          />
        </section>
      ) : null}
    </PublicShell>
  );
}