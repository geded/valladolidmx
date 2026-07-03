/**
 * MarketplaceSurface — plantilla oficial del Marketplace público.
 *
 * US-R3 · Ola 1 (Singletons). Contenido del cuerpo de `/marketplace`,
 * desacoplado de la ruta para poder ser renderizado como bloque
 * `vmx.surface.marketplace` desde una composición del Experience
 * Builder. Adopción reproductiva: paridad visual y funcional 1:1 con
 * la implementación previa; el rediseño se realiza en US-R4+.
 *
 * Los datos (`businesses`) provienen del loader de la ruta pública
 * `/marketplace/`, no de la configuración del bloque, para preservar
 * el modelo SSR read-only actual (RLS TO anon).
 */
import { Link, getRouteApi } from "@tanstack/react-router";
import type { MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";

const marketplaceRouteApi = getRouteApi("/marketplace/");

export function MarketplaceSurface() {
  const { businesses } = marketplaceRouteApi.useLoaderData();
  if (!businesses || businesses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay empresas publicadas. Vuelve pronto.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((b) => (
        <BusinessTile key={b.id} item={b} />
      ))}
    </ul>
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