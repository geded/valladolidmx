/**
 * Bloques `vmx.business.*` (US-R3 · Sub-ola 2.5c · Business Shims).
 *
 * Estos bloques son SHIMS del Surface Kit: leen el negocio activo del
 * `BusinessSurfaceContext`, mapean a ViewModels neutros vía
 * `businessToKitVM`, y delegan el render a primitives del Kit cuando
 * existe equivalencia visual 1:1.
 *
 * Reglas Sub-ola 2.5c:
 *  - IDs de bloque preservados (mismos exports que 2.2b).
 *  - `BusinessSurfaceProvider` intacto.
 *  - Mapeo vive FUERA del Kit (`./business/business-to-kit-vm.ts`).
 *  - `FavoriteButton` y `ProductActions` NO viven en el Kit — se
 *    inyectan como slots (o encapsulados en composites justificados).
 *  - Cuando un bloque no tiene primitive equivalente sin pérdida
 *    visual, se mantiene como composite documentado (no forzado).
 *  - Sin regresiones visuales (validado por
 *    `scripts/business-shim-regression.tsx`).
 *
 * Estado de migración por bloque:
 *  1. shell           → KitShell delegado.
 *  2. header-badges   → composite (Favorite + span pill inline; DOM
 *                        idéntico al legacy — pill sin `inline-flex`).
 *  3. description     → composite (párrafo suelto sin section wrapper;
 *                        KitRichText añade section/mt-10).
 *  4. gallery         → composite (placeholder gated por plan; sin
 *                        media real todavía, KitGallery no aplica).
 *  5. info            → composite (dl con `justify-between` por fila;
 *                        KitInfoTable apila dt/dd).
 *  6. products        → composite (formato de precio legacy + slots
 *                        FavoriteButton/ProductActions por card).
 *  7. promotions      → composite (FavoriteButton por promo; KitPromos
 *                        no expone slot por item).
 *  8. contact         → composite (placeholder estático; KitContact
 *                        exige valor real).
 *
 * Las 7 composites consumen los mismos mappers `businessToKitVM` que la
 * shim de Shell, dejando el terreno preparado para que primitives del
 * Kit futuros (ej. `KitPill` con slot, `KitInfoTableRows`, `KitPromos`
 * con actions por item) absorban estos bloques sin cambiar los IDs
 * `vmx.business.*` ni tocar el `CompositionRenderer`.
 */
import { useContext } from "react";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import { ProductActions } from "@/components/marketplace/ProductActions";
import { planAllows } from "@/lib/plans/plans-catalog";
import {
  BusinessSurfaceContext,
  resolveBusinessVariant,
} from "@/components/surfaces/BusinessSurface";
import type {
  MarketplaceProductCard,
  MarketplacePromotionCard,
} from "@/lib/marketplace/marketplace-reads.functions";
import { EmptyHint, KitShell } from "@/components/surfaces/kit";
import {
  businessToInfoRowVMs,
  businessToShellVM,
} from "@/components/surfaces/business/business-to-kit-vm";

function useBusiness() {
  return useContext(BusinessSurfaceContext);
}

/* ------------------------------------------------------------------ *
 * 1) Shell — Container. Envuelve al resto de bloques dentro del
 *    PublicShell oficial (eyebrow / breadcrumbs / título / descripción).
 * ------------------------------------------------------------------ */

export function BusinessShellBlock({
  renderChildren,
}: {
  renderChildren?: () => React.ReactNode;
}) {
  const b = useBusiness();
  if (!b) {
    return (
      <KitShell
        vm={{
          title: "Empresa (previsualiza con datos reales o demo)",
          crumbs: [
            { label: "Marketplace", href: "/marketplace" },
            { label: "—" },
          ],
        }}
      >
        {renderChildren?.()}
      </KitShell>
    );
  }
  return <KitShell vm={businessToShellVM(b)}>{renderChildren?.()}</KitShell>;
}

/* ------------------------------------------------------------------ *
 * 2) Header badges — Favorito + verificado.
 * ------------------------------------------------------------------ */

export function BusinessHeaderBadgesBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Badges del encabezado (favorito, verificado).</EmptyHint>;
  return (
    <div className="-mt-2 mb-6 flex flex-wrap items-center gap-3">
      <FavoriteButton entityKind="business" entityId={b.id} />
      {b.verified ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Verificado
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3) Descripción larga.
 * ------------------------------------------------------------------ */

export function BusinessDescriptionBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Descripción larga del negocio.</EmptyHint>;
  if (!b.description) return null;
  return <p className="max-w-3xl text-sm text-foreground/80">{b.description}</p>;
}

/* ------------------------------------------------------------------ *
 * 4) Galería (placeholder gated por plan).
 * ------------------------------------------------------------------ */

export function BusinessGalleryBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Galería de fotografías (según plan).</EmptyHint>;
  const enabled = planAllows(b.plan_tier, "gallery");
  if (!enabled) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Galería</h2>
        <EmptyHint>
          La galería no está incluida en el plan actual ({b.plan_tier}). Actualiza el plan para publicarla.
        </EmptyHint>
      </section>
    );
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Galería</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-video rounded-xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border"
            aria-hidden
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Sube fotografías desde el CMS de la empresa. Este bloque adopta las imágenes publicadas.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 5) Info rápida — destino, categoría, verificación.
 * ------------------------------------------------------------------ */

export function BusinessInfoBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Ficha rápida: destino, categoría, plan.</EmptyHint>;
  const rows = businessToInfoRowVMs(b);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Información</h2>
      <dl className="mt-3 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 6) Productos — misma UI de la ficha canónica.
 * ------------------------------------------------------------------ */

export function BusinessProductsBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Listado de productos, habitaciones o menú.</EmptyHint>;
  const variant = resolveBusinessVariant(b.category_slug);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{variant.productsHeading}</h2>
      {b.products.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{variant.productsEmpty}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {b.products.map((p: MarketplaceProductCard) => (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {p.product_type}
              </p>
              <h3 className="mt-1 font-semibold">{p.name}</h3>
              {p.tagline ? (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{p.tagline}</p>
              ) : null}
              {p.price_amount !== null ? (
                <p className="mt-2 text-sm font-medium">
                  {p.price_currency} {Number(p.price_amount).toFixed(2)}
                </p>
              ) : null}
              <div className="mt-3">
                <FavoriteButton entityKind="product" entityId={p.id} />
              </div>
              <div className="mt-2">
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 7) Promociones — gated por plan.
 * ------------------------------------------------------------------ */

export function BusinessPromotionsBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Promociones vigentes (según plan).</EmptyHint>;
  const allowed = planAllows(b.plan_tier, "promotions");
  if (!allowed) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Promociones vigentes</h2>
        <EmptyHint>
          Las promociones requieren un plan superior al actual ({b.plan_tier}).
        </EmptyHint>
      </section>
    );
  }
  if (b.promotions.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Promociones vigentes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sin promociones publicadas.</p>
      </section>
    );
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Promociones vigentes</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {b.promotions.map((p: MarketplacePromotionCard) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              {p.discount_percent !== null ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  −{p.discount_percent}%
                </span>
              ) : null}
            </div>
            {p.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{p.description}</p>
            ) : null}
            <div className="mt-3">
              <FavoriteButton entityKind="promotion" entityId={p.id} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 8) Contacto — placeholder de contacto/reservación.
 * ------------------------------------------------------------------ */

export function BusinessContactBlock() {
  const b = useBusiness();
  if (!b) return <EmptyHint>Bloque de contacto o reservación.</EmptyHint>;
  return (
    <section className="mt-10 rounded-2xl border border-border bg-muted/40 p-5">
      <h2 className="text-xl font-semibold">Contacto</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Los datos de contacto y reservación se toman del CMS de la empresa.
      </p>
    </section>
  );
}
