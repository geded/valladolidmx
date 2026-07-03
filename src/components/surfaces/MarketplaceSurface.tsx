/**
 * MarketplaceSurface — plantilla oficial del Marketplace público.
 *
 * Reutilizada por `/marketplace` (loader → todos los negocios publicados)
 * y por las categorías (`/hoteles`, `/restaurantes`, `/experiencias`),
 * que pasan `items` ya filtrado por `category_slug`. Sin duplicación
 * de componentes: la tarjeta `BusinessTile` se exporta para reuso.
 */
import { Link, getRouteApi } from "@tanstack/react-router";
import type { MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";

const marketplaceRouteApi = getRouteApi("/marketplace/");

export interface MarketplaceSurfaceProps {
  /** Colección explícita a renderizar; si se omite, se lee del loader de `/marketplace`. */
  items?: MarketplaceBusinessCard[];
  /** Mensaje mostrado cuando la lista está vacía. */
  emptyMessage?: string;
}

export function MarketplaceSurface(props: MarketplaceSurfaceProps = {}) {
  if (props.items !== undefined) {
    return <MarketplaceSurfaceList items={props.items} emptyMessage={props.emptyMessage} />;
  }
  return <MarketplaceSurfaceFromLoader emptyMessage={props.emptyMessage} />;
}

function MarketplaceSurfaceFromLoader({ emptyMessage }: { emptyMessage?: string }) {
  const { businesses } = marketplaceRouteApi.useLoaderData();
  return <MarketplaceSurfaceList items={businesses ?? []} emptyMessage={emptyMessage} />;
}

function MarketplaceSurfaceList({ items, emptyMessage }: { items: MarketplaceBusinessCard[]; emptyMessage?: string }) {
  const list = items;
  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? "Aún no hay empresas publicadas. Vuelve pronto."}
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((b: MarketplaceBusinessCard) => (
        <BusinessTile key={b.id} item={b} />
      ))}
    </ul>
  );
}

export function BusinessTile({ item }: { item: MarketplaceBusinessCard }) {
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