/**
 * Bloques granulares de la Plantilla Madre Business (US-R3 · Sub-ola 2.2b).
 *
 * Rompen el monolito `<BusinessSurface />` en piezas editoriales que se
 * dibujan en el árbol lateral del Studio. Todos los bloques leen el
 * negocio activo del mismo `BusinessSurfaceContext` — así comparten datos
 * en Studio (preview) y en producción (ruta pública), sin duplicar
 * lógica y sin romper paridad visual 1:1.
 *
 * Los gates por plan consultan EXCLUSIVAMENTE el Catálogo Central de
 * Planes (`@/lib/plans/plans-catalog`).
 */
import { useContext } from "react";
import { PublicShell } from "@/components/discovery";
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

function useBusiness() {
  return useContext(BusinessSurfaceContext);
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
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
      <PublicShell
        title="Empresa (previsualiza con datos reales o demo)"
        crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
      >
        {renderChildren?.()}
      </PublicShell>
    );
  }
  const variant = resolveBusinessVariant(b.category_slug);
  return (
    <PublicShell
      eyebrow={variant.eyebrow}
      title={b.display_name}
      description={b.tagline}
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: b.display_name }]}
    >
      {renderChildren?.()}
    </PublicShell>
  );
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
  const rows: Array<[string, string]> = [
    ["Destino", b.destination_slug || "—"],
    ["Categoría", b.category_slug || "—"],
    ["Verificado", b.verified ? "Sí" : "No"],
    ["Plan", b.plan_tier],
  ];
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Información</h2>
      <dl className="mt-3 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
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
