/**
 * /marketplace — Vitrina pública SSR (Ola 4 · Etapa 1).
 *
 * Lectura read-only vía marketplace-reads.functions.ts (cliente
 * publishable + RLS TO anon). Sin sesión, sin RPCs, sin escrituras.
 * head() emite título, descripción y OG/Twitter propios del listado.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  listMarketplaceBusinesses,
  type MarketplaceBusinessCard,
} from "@/lib/marketplace/marketplace-reads.functions";

const TITLE = `Marketplace — ${SITE.name}`;
const DESCRIPTION =
  "Descubre empresas verificadas, experiencias y promociones publicadas en el destino. Vitrina oficial del Marketplace.";

export const Route = createFileRoute("/marketplace/")({
  loader: async () => {
    const businesses = await listMarketplaceBusinesses();
    return { businesses };
  },
  head: () =>
    buildPublicHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/marketplace",
      ogType: "website",
    }),
  component: MarketplaceIndex,
  errorComponent: ({ error }) => (
    <PublicShell title="Marketplace no disponible" crumbs={[{ label: "Marketplace" }]}>
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell title="Marketplace no disponible" crumbs={[{ label: "Marketplace" }]}>
      <p className="text-sm text-muted-foreground">No hay empresas publicadas aún.</p>
    </PublicShell>
  ),
});

function MarketplaceIndex() {
  const { businesses } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Marketplace"
      title="Empresas y experiencias publicadas"
      description="Vitrina pública del destino. Etapa 1 — infraestructura."
      crumbs={[{ label: "Marketplace" }]}
    >
      {businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay empresas publicadas. Vuelve pronto.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b: MarketplaceBusinessCard) => (
            <BusinessTile key={b.id} item={b} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function BusinessTile({ item }: { item: MarketplaceBusinessCard }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
      <Link to="/marketplace/$slug" params={{ slug: item.slug }} className="block">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{item.display_name}</h2>
          {item.verified ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Verificada
            </span>
          ) : null}
        </div>
        {item.tagline ? (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{item.tagline}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {item.category_slug || "—"} · {item.destination_slug || "—"}
        </p>
      </Link>
    </li>
  );
}