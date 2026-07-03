/**
 * US-R3 · Ola 2 · Sub-ola 2.2 — BusinessSurface (Plantilla Madre)
 *
 * Plantilla oficial UNIVERSAL para toda ficha pública de negocio de
 * Valladolid.mx: empresas, hoteles, restaurantes, cenotes, museos,
 * agencias, tours, transportistas, tiendas, servicios, y cualquier
 * categoría futura. NO existirán plantillas independientes por
 * categoría — la categoría es una variante de esta misma plantilla.
 *
 * Reglas arquitectónicas (Founder, 15.10.4d):
 *  1. Adopción reproductiva: paridad 1:1 con la ficha actual servida
 *     por `/marketplace/{slug}`.
 *  2. La categoría sólo modifica bloques activos, CTA y validaciones.
 *     Nunca cambia arquitectura ni Studio.
 *  3. Los gates por plan consultan EXCLUSIVAMENTE el Catálogo Central
 *     de Planes (`@/lib/plans/plans-catalog`). Prohibido codificar
 *     límites o capacidades dentro de la plantilla.
 *  4. Todo bloque nuevo debe ser reutilizable, configurable,
 *     controlable por permisos y controlable por plan.
 *
 * El detalle del negocio se pasa por prop `business` o por contexto
 * `BusinessSurfaceContext` (que la ruta pública popula tras cargar la
 * empresa en el loader — patrón consistente con Region/Destination).
 */
import { createContext, useContext } from "react";
import { PublicShell } from "@/components/discovery";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import { ProductActions } from "@/components/marketplace/ProductActions";
import type {
  MarketplaceBusinessDetail,
  MarketplaceProductCard,
  MarketplacePromotionCard,
} from "@/lib/marketplace/marketplace-reads.functions";
import { planAllows } from "@/lib/plans/plans-catalog";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

const BusinessSurfaceContext = createContext<MarketplaceBusinessDetail | null>(null);

export function BusinessSurfaceProvider({
  business,
  children,
}: {
  business: MarketplaceBusinessDetail | null;
  children: React.ReactNode;
}) {
  return (
    <BusinessSurfaceContext.Provider value={business}>
      {children}
    </BusinessSurfaceContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * Variantes por categoría — sólo etiquetas y CTA. Sin nuevos bloques
 * duplicados. Añadir una categoría = añadir una entrada aquí.
 * ------------------------------------------------------------------ */

type CategoryVariant = {
  eyebrow: string;
  productsHeading: string;
  productsEmpty: string;
};

const CATEGORY_VARIANTS: Record<string, CategoryVariant> = {
  hotel:        { eyebrow: "Hospedaje",   productsHeading: "Habitaciones y experiencias", productsEmpty: "Sin habitaciones publicadas." },
  hospedaje:    { eyebrow: "Hospedaje",   productsHeading: "Habitaciones y experiencias", productsEmpty: "Sin habitaciones publicadas." },
  restaurante:  { eyebrow: "Gastronomía", productsHeading: "Menú y reservaciones",         productsEmpty: "Sin menú publicado." },
  cafeteria:    { eyebrow: "Gastronomía", productsHeading: "Menú",                          productsEmpty: "Sin menú publicado." },
  cenote:       { eyebrow: "Naturaleza",  productsHeading: "Accesos y experiencias",       productsEmpty: "Sin accesos publicados." },
  museo:        { eyebrow: "Cultura",     productsHeading: "Entradas y visitas guiadas",   productsEmpty: "Sin entradas publicadas." },
  agencia:      { eyebrow: "Operador",    productsHeading: "Tours y paquetes",              productsEmpty: "Sin tours publicados." },
  tour:         { eyebrow: "Experiencia", productsHeading: "Tours disponibles",             productsEmpty: "Sin tours publicados." },
  transporte:   { eyebrow: "Transporte",  productsHeading: "Rutas y traslados",             productsEmpty: "Sin traslados publicados." },
  tienda:       { eyebrow: "Tienda",      productsHeading: "Catálogo",                       productsEmpty: "Sin productos publicados." },
  servicio:     { eyebrow: "Servicio",    productsHeading: "Servicios",                      productsEmpty: "Sin servicios publicados." },
};

function resolveVariant(categorySlug: string): CategoryVariant {
  return (
    CATEGORY_VARIANTS[categorySlug] ?? {
      eyebrow: "Marketplace",
      productsHeading: "Productos y experiencias",
      productsEmpty: "Sin productos publicados.",
    }
  );
}

/* ------------------------------------------------------------------ *
 * Surface
 * ------------------------------------------------------------------ */

export interface BusinessSurfaceProps {
  /** Cuando falta, se lee del `BusinessSurfaceContext`. */
  business?: MarketplaceBusinessDetail | null;
}

export function BusinessSurface({ business: propBusiness }: BusinessSurfaceProps = {}) {
  const ctxBusiness = useContext(BusinessSurfaceContext);
  const b = propBusiness ?? ctxBusiness;

  if (!b) {
    return (
      <PublicShell
        title="Empresa no disponible"
        crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
      >
        <p className="text-sm text-muted-foreground">
          Aún no publicamos esta empresa.
        </p>
      </PublicShell>
    );
  }

  const variant = resolveVariant(b.category_slug);
  const tier = b.plan_tier;
  const showPromotions = planAllows(tier, "promotions") && b.promotions.length > 0;

  return (
    <PublicShell
      eyebrow={variant.eyebrow}
      title={b.display_name}
      description={b.tagline}
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: b.display_name }]}
    >
      <div className="-mt-2 mb-6 flex flex-wrap items-center gap-3">
        <FavoriteButton entityKind="business" entityId={b.id} />
        {b.verified ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Verificado
          </span>
        ) : null}
      </div>

      {b.description ? (
        <p className="max-w-3xl text-sm text-foreground/80">{b.description}</p>
      ) : null}

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

      {showPromotions ? (
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
      ) : null}
    </PublicShell>
  );
}
