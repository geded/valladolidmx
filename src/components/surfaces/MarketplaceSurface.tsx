/**
 * MarketplaceSurface — plantilla oficial del Marketplace público.
 *
 * Reutilizada por `/marketplace` (loader → todos los negocios publicados)
 * y por las categorías (`/hoteles`, `/restaurantes`, `/experiencias`),
 * que pasan `items` ya filtrado por `category_slug`. Sin duplicación
 * de componentes: la tarjeta `BusinessTile` se exporta para reuso.
 */
import { Link } from "@tanstack/react-router";
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { resolveCanonicalPath } from "@/lib/navigation";

export interface MarketplaceSurfaceProps {
  /** Colección explícita a renderizar; si se omite, se lee del loader de `/marketplace`. */
  items?: MarketplaceBusinessCard[];
  /** Mensaje mostrado cuando la lista está vacía. */
  emptyMessage?: string;
}

export function MarketplaceSurface(props: MarketplaceSurfaceProps = {}) {
  // US-E3.2 · Fase B — el hub `/marketplace` se retiró (301 → /oriente-maya).
  // Ahora `items` es requerido en la práctica: quien monte esta superficie
  // debe suministrar el listado desde su propio loader.
  return <MarketplaceSurfaceList items={props.items ?? []} emptyMessage={props.emptyMessage} />;
}

function MarketplaceSurfaceList({
  items,
  emptyMessage,
}: {
  items: MarketplaceBusinessCard[];
  emptyMessage?: string;
}) {
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
  const territorial =
    item.destination_slug && item.category_slug
      ? resolveCanonicalPath({
          kind: "business",
          slug: item.slug,
          category: item.category_slug,
          destination: item.destination_slug,
        })
      : null;
  return (
    <li className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
      {territorial ? (
        <Link to={territorial} className="block">
          <BusinessTileHeader item={item} />
        </Link>
      ) : (
        <Link to="/marketplace/$" params={{ _splat: item.slug }} className="block">
          <BusinessTileHeader item={item} />
        </Link>
      )}
      <div className="mt-3">
        <AddToTravelPlanButton
          kind="business"
          targetId={item.id}
          title={item.display_name}
          slug={item.slug}
          subtitle={item.category_slug || item.destination_slug || null}
        />
      </div>
    </li>
  );
}

function BusinessTileHeader({ item }: { item: MarketplaceBusinessCard }) {
  return (
    <>
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
    </>
  );
}
