/**
 * /marketplace/buscar — Ola 4 · Etapa 2.
 *
 * Búsqueda pública sobre productos publicados (`search_marketplace` RPC).
 * SSR: el loader recibe los search params validados y precarga resultados.
 * UI: filtros simples (texto, destino, categoría, rango de precio) +
 * paginación. Lectura read-only, sin sesión y sin acceso a tablas crudas.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  searchMarketplace,
  type MarketplaceSearchHit,
} from "@/lib/marketplace/marketplace-reads.functions";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { ORIENTE_MAYA } from "@/config/regions";

interface SearchParams {
  q?: string;
  destino?: string;
  categoria?: string;
  pmin?: number;
  pmax?: number;
  page?: number;
}

const PAGE_SIZE = 24;
const TITLE = `Buscar en el Catálogo — ${SITE.name}`;
const DESCRIPTION =
  "Busca productos, experiencias y promociones publicadas por destino, categoría y rango de precio.";

/**
 * H-02 · I7 · Fila 5 — Búsqueda del Marketplace.
 * Mismo patrón condicional aprobado para `/experiencias` con `?tema=`:
 *  · Sin filtros de contenido → hereda territorio (previous + inherit).
 *  · Con `?destino=` explícito → ancestros territoriales explícitos.
 *  · Con filtros de contenido (q / categoria / pmin / pmax) → conserva
 *    breadcrumb legacy `Marketplace › Buscar` (no queremos que el
 *    territorio implícito contradiga el filtro activo).
 * SEO intacto (`canonical = /marketplace/buscar`, robots noindex,follow).
 */
function buildBuscarContext(destino: string | undefined): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
        { kind: "region" as const, slug: ORIENTE_MAYA.slug, label: ORIENTE_MAYA.name, href: "/oriente-maya" },
        { kind: "destination" as const, slug: destino, label: destino.replace(/-/g, " "), href: `/oriente-maya/${destino}` },
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "marketplace-buscar", label: "Buscar", href: "/marketplace/buscar" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/marketplace/buscar",
  });
}

function clampString(v: unknown, max = 120): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return undefined;
  return t;
}
function clampNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

export const Route = createFileRoute("/marketplace/buscar")({
  validateSearch: (raw: Record<string, unknown>): SearchParams => ({
    q: clampString(raw.q, 200),
    destino: clampString(raw.destino),
    categoria: clampString(raw.categoria),
    pmin: clampNumber(raw.pmin),
    pmax: clampNumber(raw.pmax),
    page: clampNumber(raw.page),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }) => {
    const page = Math.max(1, Math.floor(deps.search.page ?? 1));
    const result = await searchMarketplace({
      data: {
        q: deps.search.q ?? null,
        destination_slug: deps.search.destino ?? null,
        category_slug: deps.search.categoria ?? null,
        price_min: deps.search.pmin ?? null,
        price_max: deps.search.pmax ?? null,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      },
    });
    return { result, page };
  },
  head: () =>
    buildPublicHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/marketplace/buscar",
      ogType: "website",
      robots: "noindex,follow",
    }),
  component: MarketplaceSearchPage,
  errorComponent: ({ error }) => (
    <PublicShell
      title="Búsqueda no disponible"
      crumbs={[{ label: "Catálogo", to: "/marketplace" }, { label: "Buscar" }]}
      contextDeclaration={buildBuscarContext(undefined)}
      useContextCrumbs
    >
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell
      title="Sin resultados"
      crumbs={[{ label: "Catálogo", to: "/marketplace" }, { label: "Buscar" }]}
      contextDeclaration={buildBuscarContext(undefined)}
      useContextCrumbs
    >
      <p className="text-sm text-muted-foreground">No encontramos coincidencias.</p>
    </PublicShell>
  ),
});

function MarketplaceSearchPage() {
  const { result, page } = Route.useLoaderData();
  const search = Route.useSearch();
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  // Filtros de contenido (no territoriales) — desactivan herencia de
  // migas para no colgar territorio bajo un resultado ya restringido.
  const hasContentFilter = Boolean(
    (search.q && search.q.length > 0) ||
      (search.categoria && search.categoria.length > 0) ||
      typeof search.pmin === "number" ||
      typeof search.pmax === "number",
  );

  return (
    <PublicShell
      eyebrow="Catálogo Oriente Maya"
      title="Buscar en el catálogo"
      description="Productos, experiencias y promociones publicadas."
      crumbs={[{ label: "Catálogo", to: "/marketplace" }, { label: "Buscar" }]}
      contextDeclaration={buildBuscarContext(search.destino)}
      useContextCrumbs={!hasContentFilter}
    >
      <form method="get" className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs md:col-span-2">
          <span className="font-medium uppercase tracking-wide text-muted-foreground">Texto</span>
          <input
            type="search"
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Hotel, tour, restaurante…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium uppercase tracking-wide text-muted-foreground">Destino</span>
          <input
            type="text"
            name="destino"
            defaultValue={search.destino ?? ""}
            placeholder="slug del destino"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium uppercase tracking-wide text-muted-foreground">Categoría</span>
          <input
            type="text"
            name="categoria"
            defaultValue={search.categoria ?? ""}
            placeholder="slug de categoría"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">Mín</span>
            <input
              type="number"
              name="pmin"
              min={0}
              defaultValue={search.pmin ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">Máx</span>
            <input
              type="number"
              name="pmax"
              min={0}
              defaultValue={search.pmax ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="md:col-span-5">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Buscar
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {result.total} resultado{result.total === 1 ? "" : "s"} · página {page} de {totalPages}
      </p>

      {result.items.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No hay resultados con los filtros actuales.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((hit: MarketplaceSearchHit) => (
            <SearchHitCard key={hit.product_id} hit={hit} />
          ))}
        </ul>
      )}

      <nav className="mt-10 flex items-center justify-between text-sm">
        <PageLink
          label="← Anterior"
          enabled={page > 1}
          to={{ ...search, page: Math.max(1, page - 1) }}
        />
        <PageLink
          label="Siguiente →"
          enabled={page < totalPages}
          to={{ ...search, page: page + 1 }}
        />
      </nav>
    </PublicShell>
  );
}

function SearchHitCard({ hit }: { hit: MarketplaceSearchHit }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <Link
        to="/marketplace/$slug"
        params={{ slug: hit.business_slug }}
        className="block"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          {hit.product_type || "producto"}
        </p>
        <h2 className="mt-1 text-base font-semibold">{hit.product_name}</h2>
        {hit.product_tagline ? (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{hit.product_tagline}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {hit.business_name} · {hit.destination_slug || "—"} · {hit.category_slug || "—"}
        </p>
        {hit.price_amount !== null ? (
          <p className="mt-3 text-sm font-medium">
            {hit.price_currency} {hit.price_amount.toLocaleString()}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function PageLink({
  label,
  enabled,
  to,
}: {
  label: string;
  enabled: boolean;
  to: SearchParams;
}) {
  if (!enabled) {
    return <span className="text-muted-foreground opacity-50">{label}</span>;
  }
  return (
    <Link to="/marketplace/buscar" search={to} className="text-primary hover:underline">
      {label}
    </Link>
  );
}