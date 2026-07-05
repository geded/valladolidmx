/**
 * Bloques `vmx.product.*` (US-R3 · Sub-ola 2.5b · Product Shims).
 *
 * Estos bloques son SHIMS: leen el producto activo del contexto
 * (`ProductSurfaceContext`), mapean a ViewModels neutros vía
 * `productToKitVM`, y delegan el render a los primitives del Surface Kit.
 *
 * Reglas Sub-ola 2.5b:
 *  - IDs de bloque preservados (mismos exports que 2.3a).
 *  - `__tpl_product__` intacto.
 *  - Mapeo vive FUERA del Kit (`./product/product-to-kit-vm.ts`).
 *  - `ProductActions` y `FavoriteButton` NO viven en el Kit — se inyectan
 *    como slots (`actions`) en `KitHero` y `KitPriceCta`.
 *  - `vmx.product.business-context` conserva su render específico (no hay
 *    primitive de Kit equivalente sin perder atributos semánticos como
 *    la insignia "Verificado"); su lógica queda encapsulada aquí para
 *    migrarse en 2.5c cuando el Kit incorpore composición de "authored-by".
 *  - Sin regresiones visuales (validado por `product-shim-regression.tsx`).
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { ProductActions } from "@/components/commerce/ProductActions";
import { ReviewComposer } from "@/components/reviews/ReviewComposer";
import { SITE } from "@/config/site";
import { resolveCanonicalPath } from "@/lib/navigation";
import { useProduct } from "@/components/surfaces/ProductSurface";
import {
  EmptyHint,
  KitFaq,
  KitGallery,
  KitHero,
  KitPriceCta,
  KitPromos,
  KitReviews,
  KitRichText,
  KitShell,
  KitCardGrid,
} from "@/components/surfaces/kit";
import {
  productToDescriptionVM,
  productToFaqVMs,
  productToGalleryVM,
  productToHeroVM,
  productToPriceCtaVM,
  productToPromoVMs,
  productToRelatedCardVMs,
  productToReviewVMs,
  productToReviewStatsVM,
  productToShellVM,
} from "@/components/surfaces/product/product-to-kit-vm";

/* ------------------------------------------------------------------ *
 * 1) Shell — KitShell + breadcrumbs canónicos.
 * ------------------------------------------------------------------ */
export function ProductShellBlock({
  renderChildren,
}: {
  renderChildren?: () => ReactNode;
}) {
  const p = useProduct();
  if (!p) {
    return (
      <KitShell
        vm={{
          title: "Producto (previsualiza con datos reales o demo)",
          crumbs: [
            { label: "Catálogo", href: "/oriente-maya" },
            { label: "—" },
          ],
        }}
      >
        {renderChildren?.()}
      </KitShell>
    );
  }
  return <KitShell vm={productToShellVM(p)}>{renderChildren?.()}</KitShell>;
}

/* ------------------------------------------------------------------ *
 * 2) Hero — KitHero + FavoriteButton en slot `actions`.
 * ------------------------------------------------------------------ */
export function ProductHeroBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Hero del producto: tipo, título y tagline.</EmptyHint>;
  return (
    <KitHero
      vm={{
        ...productToHeroVM(p),
        actions: (
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton entityKind="product" entityId={p.id} />
            <AddToTravelPlanButton
              kind="product"
              targetId={p.id}
              title={p.name}
              slug={p.slug}
              subtitle={p.product_type}
            />
          </div>
        ),
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * 3) Gallery — KitGallery.
 * ------------------------------------------------------------------ */
export function ProductGalleryBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Portada + galería del producto.</EmptyHint>;
  return <KitGallery vm={productToGalleryVM(p)} />;
}

/* ------------------------------------------------------------------ *
 * 4) Price + CTA — KitPriceCta + ProductActions en slot `actions`.
 * ------------------------------------------------------------------ */
export function ProductPriceCtaBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Precio + acciones de conversión.</EmptyHint>;
  const actions = (
    <ProductActions
      product={{
        id: p.id,
        conversion_mode: p.conversion_mode,
        primary_action_label: p.primary_action_label,
        secondary_action_mode: p.secondary_action_mode,
        secondary_action_label: p.secondary_action_label,
        accepts_online_payment: p.accepts_online_payment,
      }}
    />
  );
  return <KitPriceCta vm={productToPriceCtaVM(p, actions)} />;
}

/* ------------------------------------------------------------------ *
 * 5) Description — KitRichText.
 * ------------------------------------------------------------------ */
export function ProductDescriptionBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Descripción larga del producto.</EmptyHint>;
  return <KitRichText vm={productToDescriptionVM(p)} />;
}

/* ------------------------------------------------------------------ *
 * 6) Business Context — composite Product-specific (sin equivalente Kit).
 * ------------------------------------------------------------------ */
export function ProductBusinessContextBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Contexto de la empresa que ofrece el producto.</EmptyHint>;
  const b = p.business;
  const destSlug = b.destination_slug;
  const catSlug = b.category_slug;
  const businessHref =
    destSlug && catSlug
      ? resolveCanonicalPath({
          kind: "business",
          slug: b.slug,
          category: catSlug,
          destination: destSlug,
        })
      : `/marketplace/${b.slug}`;
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ofrecido por
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link
            to={businessHref}
            className="text-lg font-semibold text-foreground hover:underline"
          >
            {b.display_name}
          </Link>
          {b.tagline ? (
            <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
          ) : null}
        </div>
        {b.verified ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Verificado
          </span>
        ) : null}
      </div>

      {(b.primary_location || b.primary_contact) && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {b.primary_location ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Ubicación
              </dt>
              <dd className="mt-1 text-foreground">
                {b.primary_location.label ? (
                  <span className="font-medium">{b.primary_location.label}<br /></span>
                ) : null}
                {b.primary_location.address_line1}
                {b.primary_location.address_line2 ? `, ${b.primary_location.address_line2}` : ""}
              </dd>
            </div>
          ) : null}
          {b.primary_contact ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Contacto ({b.primary_contact.type})
              </dt>
              <dd className="mt-1 text-foreground">
                {b.primary_contact.label ? `${b.primary_contact.label} · ` : ""}
                {b.primary_contact.value}
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 7) Promos — KitPromos.
 * ------------------------------------------------------------------ */
export function ProductPromosBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Promociones vigentes de la empresa.</EmptyHint>;
  return <KitPromos promotions={productToPromoVMs(p)} />;
}

/* ------------------------------------------------------------------ *
 * 8) Reviews — KitReviews (con emptyLabel acentuado).
 * ------------------------------------------------------------------ */
export function ProductReviewsBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Opiniones de viajeros.</EmptyHint>;
  return (
    <section>
      <div className="mb-3 flex items-center justify-end">
        <ReviewComposer
          subjectKind="product"
          subjectId={p.id}
          subjectName={p.name}
        />
      </div>
      <KitReviews
        reviews={productToReviewVMs(p)}
        stats={productToReviewStatsVM(p)}
        emptyLabel="Sin opiniones publicadas todavía."
      />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 9) FAQ — KitFaq.
 * ------------------------------------------------------------------ */
export function ProductFaqBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Preguntas frecuentes del producto.</EmptyHint>;
  return <KitFaq faqs={productToFaqVMs(p)} />;
}

/* ------------------------------------------------------------------ *
 * 10) Related — KitCardGrid (encabezado wrapping section).
 * ------------------------------------------------------------------ */
export function ProductRelatedBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Otros productos de la misma empresa.</EmptyHint>;
  if (p.related.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">
        Otros productos de {p.business.display_name}
      </h2>
      <KitCardGrid vm={{ items: productToRelatedCardVMs(p), columns: 3 }} />
    </section>
  );
}

export { SITE };