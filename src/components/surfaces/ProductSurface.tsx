/* eslint-disable react-refresh/only-export-components */
/**
 * ProductSurface — Plantilla Madre de Producto (US-R3 · Sub-ola 2.3a).
 *
 * Superficie propia (NO reciclada de `BusinessProductsBlock`, que es un
 * bloque de LISTADO dentro de una empresa). Aquí renderizamos la ficha
 * individual de un producto, editable por bloques `vmx.product.*` desde
 * el Experience Builder. En producción y en Studio se inyecta el
 * detalle vía `ProductSurfaceProvider`; los bloques leen del contexto.
 */
import { createContext, useContext, type ReactNode } from "react";
import { PublicShell } from "@/components/discovery";
import type { MarketplaceProductDetail } from "@/lib/catalog/marketplace-reads.functions";
import type { ProductRelatedDTO } from "@/lib/catalog/product-related.functions";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { PremiumHero } from "@/components/premium";
import {
  createProductSurfaceContract,
  type ProductSurfaceContractInput,
} from "@/lib/omxds/surfaces/product-surface.contract";
import { adaptExperienceSurfaceContract } from "@/lib/omxds/surfaces/experience-surface.adapter";
import {
  isOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
} from "@/lib/omxds/surfaces/surface-contract";

export const ProductSurfaceContext = createContext<MarketplaceProductDetail | null>(null);

export function useProduct(): MarketplaceProductDetail | null {
  return useContext(ProductSurfaceContext);
}

/**
 * E2 · US-E2.2 — Contexto complementario para Related Collection.
 * Se mantiene independiente para no romper consumidores existentes
 * de `ProductSurfaceContext`.
 */
export const ProductSurfaceRelatedContext = createContext<ProductRelatedDTO | null>(null);

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

function canonicalProductHref(product: MarketplaceProductDetail): string {
  const destination = product.business.destination_slug;
  const category = product.business.category_slug;
  if (destination && category) {
    return `/oriente-maya/${encodeURIComponent(destination)}/${encodeURIComponent(category)}/${encodeURIComponent(product.business.slug)}/${encodeURIComponent(product.slug)}`;
  }
  return `/producto/${encodeURIComponent(product.slug)}`;
}

function relatedCount(
  product: MarketplaceProductDetail,
  related?: ProductRelatedDTO | null,
): number {
  return (
    product.related.length +
    (related?.sameCategoryInDestination.length ?? 0) +
    (related?.otherInDestination.length ?? 0)
  );
}

export interface ProductSurfaceContractBoundaryProps {
  enabled: boolean;
  product: MarketplaceProductDetail | null;
  related?: ProductRelatedDTO | null;
  legacy: ReactNode;
}

export function ProductSurfaceContractBoundary({
  enabled,
  product,
  related,
  legacy,
}: ProductSurfaceContractBoundaryProps) {
  if (!enabled || !product) return legacy;

  const input: ProductSurfaceContractInput = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productType: product.product_type,
    businessName: product.business.display_name,
    canonicalUrl: canonicalProductHref(product),
    hasMedia: Boolean(product.cover_url || product.media.some((item) => item.url)),
    hasCollection: relatedCount(product, related) > 0,
    verifiedBusiness: product.business.verified,
  };
  const surfaceContract =
    adaptExperienceSurfaceContract(input) ?? createProductSurfaceContract(input);
  if (!surfaceContract) return legacy;

  return <ProductSurface product={product} surfaceContract={surfaceContract} />;
}

/**
 * Fallback monolítico usado por la ruta pública cuando la composición
 * `__tpl_product__` no está publicada (contingencia). No se registra en
 * el Studio ni compite con los bloques granulares.
 */
export function ProductSurface({
  product: propProduct,
  surfaceContract,
}: {
  product?: MarketplaceProductDetail | null;
  surfaceContract?: OmxdsSurfaceContract;
} = {}) {
  const ctxProduct = useContext(ProductSurfaceContext);
  const p = propProduct ?? ctxProduct;
  const related = useContext(ProductSurfaceRelatedContext);
  if (!p) {
    return (
      <PublicShell
        title="Producto no disponible"
        crumbs={[{ label: "Catálogo", to: "/oriente-maya" }, { label: "—" }]}
      >
        <p className="text-sm text-muted-foreground">Aún no publicamos esta ficha.</p>
      </PublicShell>
    );
  }

  const activeContract =
    surfaceContract &&
    isOmxdsSurfaceContract(surfaceContract) &&
    ["product", "experience"].includes(surfaceContract.family)
      ? surfaceContract
      : null;
  const hasSameBusiness = (p.related?.length ?? 0) > 0;
  const hasSameCatDest = (related?.sameCategoryInDestination.length ?? 0) > 0;
  const hasOtherDest = (related?.otherInDestination.length ?? 0) > 0;
  const showDescubre =
    !activeContract?.omissions.includes("collection") &&
    (hasSameBusiness || hasSameCatDest || hasOtherDest);
  const dominantAction = activeContract?.actions.find(
    (action) => action.role === "dominant" && action.id === "add_to_trip",
  );
  const tripEligibility = evaluateTripEligibility({
    kind: "product",
    targetId: p.id,
    title: p.name,
  });

  return (
    <PublicShell
      eyebrow={activeContract ? undefined : p.product_type}
      title={activeContract ? undefined : p.name}
      description={activeContract ? undefined : p.tagline}
      crumbs={[
        { label: "Catálogo", to: "/oriente-maya" },
        { label: p.business.display_name, to: `/marketplace/${p.business.slug}` },
        { label: p.name },
      ]}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      {activeContract ? (
        <PremiumHero
          vm={{
            presentation: p.cover_url ? "cinematic" : "editorial",
            crumbs: [
              { label: "Inicio", href: "/" },
              { label: "Oriente Maya de Yucatán", href: "/oriente-maya" },
              ...(p.business.destination_slug
                ? [
                    {
                      label: p.business.destination_slug,
                      href: `/oriente-maya/${encodeURIComponent(p.business.destination_slug)}`,
                    },
                  ]
                : []),
              { label: p.business.display_name },
              { label: p.name },
            ],
            eyebrow: p.product_type,
            title: p.name,
            description: p.tagline || p.description || undefined,
            media:
              p.cover_url && !activeContract.omissions.includes("media")
                ? { url: p.cover_url, alt: p.name }
                : null,
          }}
        />
      ) : null}

      {p.description ? (
        <p className="max-w-3xl text-sm text-foreground/80">{p.description}</p>
      ) : null}

      {dominantAction && tripEligibility.eligible && tripEligibility.identity ? (
        <div className="mt-6">
          <AddToTravelPlanButton
            kind={tripEligibility.identity.kind}
            targetId={tripEligibility.identity.targetId}
            title={p.name}
            slug={p.slug}
            imageUrl={activeContract?.omissions.includes("media") ? null : p.cover_url}
            subtitle={p.product_type}
          />
        </div>
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
                showPrice: !activeContract,
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
