/**
 * LEGACY · Snapshot pre-Sub-ola-2.5b de los bloques `vmx.product.*` antes
 * de migrarlos a shims del Surface Kit. Se conserva EXCLUSIVAMENTE como
 * referencia para la prueba de regresión (`product-shim-regression.tsx`)
 * que compara HTML antes/después.
 *
 * No se importa desde el runtime público ni desde el preview-registry.
 * No editar salvo para reflejar el estado previo a la migración.
 *
 * Original doc:
 * Bloques granulares de la Plantilla Madre Producto (US-R3 · Sub-ola 2.3a).
 *
 * Todos los bloques leen el producto activo de `ProductSurfaceContext`
 * (poblado por la ruta pública o por el Studio vía preview-registry).
 * Sin datos: cada bloque muestra un hint editorial reversible; nunca
 * rompe el canvas.
 *
 * CRÍTICO: Product tiene superficie propia. Estos bloques NO son un
 * reciclaje del `BusinessProductsBlock` (que es catálogo dentro de una
 * empresa). Ficha ≠ Catálogo.
 */
import { Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { ProductActions } from "@/components/commerce/ProductActions";
import { SITE } from "@/config/site";
import { useProduct } from "@/components/surfaces/ProductSurface";
import type {
  MarketplaceProductCard,
  MarketplaceProductDetail,
  ProductMediaItem,
} from "@/lib/catalog/marketplace-reads.functions";

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function formatPrice(amount: number | null, currency: string): string | null {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/* ------------------------------------------------------------------ *
 * 1) Shell — Contenedor con PublicShell + breadcrumbs canónicos.
 * ------------------------------------------------------------------ */

export function ProductShellBlock({ renderChildren }: { renderChildren?: () => React.ReactNode }) {
  const p = useProduct();
  if (!p) {
    return (
      <PublicShell
        title="Producto (previsualiza con datos reales o demo)"
        crumbs={[{ label: "Catálogo", to: "/oriente-maya" }, { label: "—" }]}
      >
        {renderChildren?.()}
      </PublicShell>
    );
  }
  return (
    <PublicShell
      crumbs={[
        { label: "Catálogo", to: "/oriente-maya" },
        { label: p.business.display_name, to: `/marketplace/${p.business.slug}` },
        { label: p.name },
      ]}
    >
      {renderChildren?.()}
    </PublicShell>
  );
}

/* ------------------------------------------------------------------ *
 * 2) Hero — Eyebrow (tipo), título, tagline, favorito.
 * ------------------------------------------------------------------ */

export function ProductHeroBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Hero del producto: tipo, título y tagline.</EmptyHint>;
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {p.product_type}
      </p>
      <h1 className="text-balance text-3xl md:text-4xl font-semibold">{p.name}</h1>
      {p.tagline ? (
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{p.tagline}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FavoriteButton entityKind="product" entityId={p.id} />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * 3) Gallery — Portada + galería con scroll-snap mobile.
 * ------------------------------------------------------------------ */

function coverAndGallery(p: MarketplaceProductDetail): {
  cover: ProductMediaItem | null;
  gallery: ProductMediaItem[];
} {
  const cover = p.media.find((m) => m.role === "cover") ?? p.media[0] ?? null;
  const gallery = p.media.filter((m) => m.id !== cover?.id);
  return { cover, gallery };
}

export function ProductGalleryBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Portada + galería del producto.</EmptyHint>;
  const { cover, gallery } = coverAndGallery(p);
  if (!cover && gallery.length === 0) {
    return (
      <section className="mt-8">
        <div
          className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border"
          aria-hidden
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sin fotografías. Súbelas desde el CMS de producto.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-8 space-y-3">
      {cover?.url ? (
        <img
          src={cover.url}
          alt={cover.alt ?? p.name}
          className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-border"
          loading="eager"
        />
      ) : (
        <div
          className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border"
          aria-hidden
        />
      )}
      {gallery.length > 0 ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {gallery.map((m) => (
            <li
              key={m.id}
              className="w-[72%] shrink-0 snap-center overflow-hidden rounded-xl ring-1 ring-border sm:w-auto"
            >
              {m.url ? (
                <img
                  src={m.url}
                  alt={m.alt ?? ""}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-muted" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 4) Price + CTA — Precio prominente + ProductActions.
 * ------------------------------------------------------------------ */

export function ProductPriceCtaBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Precio + acciones de conversión.</EmptyHint>;
  const price = formatPrice(p.price_amount, p.price_currency);
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:sticky md:top-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          {price ? (
            <p className="text-2xl font-semibold">{price}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Precio bajo consulta</p>
          )}
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {p.conversion_mode.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <div className="mt-4">
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
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 5) Description — Descripción larga.
 * ------------------------------------------------------------------ */

export function ProductDescriptionBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Descripción larga del producto.</EmptyHint>;
  if (!p.description) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Descripción</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sin descripción. Añádela desde el CMS de producto.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Descripción</h2>
      <div className="mt-3 max-w-3xl whitespace-pre-line text-sm text-foreground/85">
        {p.description}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 6) Business Context — Empresa padre + link + contacto + ubicación.
 * ------------------------------------------------------------------ */

export function ProductBusinessContextBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Contexto de la empresa que ofrece el producto.</EmptyHint>;
  const b = p.business;
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ofrecido por
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link
            to="/marketplace/$"
            params={{ _splat: b.slug }}
            className="text-lg font-semibold text-foreground hover:underline"
          >
            {b.display_name}
          </Link>
          {b.tagline ? <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p> : null}
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
                  <span className="font-medium">
                    {b.primary_location.label}
                    <br />
                  </span>
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
 * 7) Promos — Promociones vigentes de la empresa padre.
 * ------------------------------------------------------------------ */

export function ProductPromosBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Promociones vigentes de la empresa.</EmptyHint>;
  if (p.promotions.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Promociones vigentes</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {p.promotions.map((pr) => (
          <li key={pr.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{pr.title}</h3>
              {pr.discount_percent !== null ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  −{pr.discount_percent}%
                </span>
              ) : null}
            </div>
            {pr.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{pr.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 8) Reviews — Opiniones publicadas.
 * ------------------------------------------------------------------ */

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span aria-label={`${full} de 5`} className="text-primary">
      {"★".repeat(full)}
      <span className="text-muted-foreground">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function ProductReviewsBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Opiniones de viajeros.</EmptyHint>;
  if (p.reviews.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Opiniones</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sin opiniones publicadas todavía.</p>
      </section>
    );
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Opiniones</h2>
      <ul className="mt-4 space-y-4">
        {p.reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{r.author_display_name}</p>
              <Stars rating={r.rating} />
            </div>
            {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
            <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 9) FAQ — Preguntas frecuentes.
 * ------------------------------------------------------------------ */

export function ProductFaqBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Preguntas frecuentes del producto.</EmptyHint>;
  if (p.faqs.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {p.faqs.map((f) => (
          <li key={f.id} className="p-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">{f.question}</summary>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">{f.answer}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 10) Related — Otros productos de la misma empresa.
 * ------------------------------------------------------------------ */

export function ProductRelatedBlock() {
  const p = useProduct();
  if (!p) return <EmptyHint>Otros productos de la misma empresa.</EmptyHint>;
  if (p.related.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Otros productos de {p.business.display_name}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {p.related.map((r: MarketplaceProductCard) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {r.product_type}
            </p>
            <Link
              to="/producto/$slug"
              params={{ slug: r.slug }}
              className="mt-1 block font-semibold hover:underline"
            >
              {r.name}
            </Link>
            {r.tagline ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.tagline}</p>
            ) : null}
            {r.price_amount !== null ? (
              <p className="mt-2 text-sm font-medium">
                {formatPrice(r.price_amount, r.price_currency)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Exportamos SITE para posibles usos downstream (SEO en head loader).
export { SITE };
