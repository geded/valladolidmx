/**
 * /marketplace/$slug — Ficha pública SSR de una empresa (Ola 4 · Etapa 1).
 *
 * Lectura read-only vía marketplace-reads.functions.ts. head() emite
 * título/descripción propios y JSON-LD LocalBusiness derivado del loader.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import { ProductActions } from "@/components/marketplace/ProductActions";
import {
  getMarketplaceBusinessBySlug,
  type MarketplaceBusinessDetail,
  type MarketplaceProductCard,
  type MarketplacePromotionCard,
} from "@/lib/marketplace/marketplace-reads.functions";

export const Route = createFileRoute("/marketplace/$slug")({
  loader: async ({ params }) => {
    const business = await getMarketplaceBusinessBySlug({ data: { slug: params.slug } });
    if (!business) throw notFound();
    return { business };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const b = loaderData.business;
    const title = `${b.display_name} — ${SITE.name}`;
    const description = b.tagline || b.description.slice(0, 160) || `${b.display_name} en el Marketplace de ${SITE.name}.`;
    return buildPublicHead({
      title,
      description,
      path: `/marketplace/${b.slug}`,
      ogType: "website",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: b.display_name,
          description,
          url: `${SITE.url}/marketplace/${b.slug}`,
        },
      ],
    });
  },
  component: MarketplaceBusinessPage,
  errorComponent: ({ error }) => (
    <PublicShell title="Empresa no disponible" crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}>
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell title="Empresa no encontrada" crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}>
      <p className="text-sm text-muted-foreground">No publicamos esa empresa todavía.</p>
    </PublicShell>
  ),
});

function MarketplaceBusinessPage() {
  const { business } = Route.useLoaderData();
  const b: MarketplaceBusinessDetail = business;
  return (
    <PublicShell
      eyebrow="Marketplace"
      title={b.display_name}
      description={b.tagline}
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: b.display_name }]}
    >
      <div className="-mt-2 mb-6 flex flex-wrap items-center gap-3">
        <FavoriteButton entityKind="business" entityId={b.id} />
      </div>
      {b.description ? (
        <p className="max-w-3xl text-sm text-foreground/80">{b.description}</p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Productos y experiencias</h2>
        {b.products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin productos publicados.</p>
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

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Promociones vigentes</h2>
        {b.promotions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin promociones publicadas.</p>
        ) : (
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
        )}
      </section>
    </PublicShell>
  );
}