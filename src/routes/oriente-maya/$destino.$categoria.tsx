/**
 * /oriente-maya/{destino}/{categoria} — Ficha territorial de Categoría
 * en Destino (Navigation Blueprint v1.0 · Sub-ola N2.1).
 *
 * Sub-ola N2.1 · alcance intencional:
 *  - Rutas base con resolver territorial + canonical self-referencial.
 *  - Breadcrumbs y `head()` completos vía Navigation Contract (N1).
 *  - Superficie mínima coherente (listado editorial de empresas).
 *  - No se toca aún UX profunda ni composición de EB — llega en N2.2.
 *  - No se activan redirects 301 (Fase 2 de N2.3, previa validación).
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  resolveTerritorialPath,
  resolutionToNavigationContext,
} from "@/lib/navigation/territorial-resolver.functions";
import { buildBreadcrumbs, resolveCanonicalPath } from "@/lib/navigation";
import {
  listMarketplaceBusinesses,
  type MarketplaceBusinessCard,
} from "@/lib/marketplace/marketplace-reads.functions";

export const Route = createFileRoute("/oriente-maya/$destino/$categoria")({
  loader: async ({ params }) => {
    const resolution = await resolveTerritorialPath({
      data: { destino: params.destino, categoria: params.categoria },
    });
    if (
      resolution.reason === "destination_not_found" ||
      resolution.reason === "category_not_found"
    ) {
      throw notFound();
    }
    // Listado de empresas por dest+cat (filtrado defensivo cliente,
    // fuente única de verdad ya validada por el resolver).
    const businesses = await listMarketplaceBusinesses().catch(
      () => [] as MarketplaceBusinessCard[],
    );
    const items: MarketplaceBusinessCard[] = businesses.filter(
      (b: MarketplaceBusinessCard) =>
        b.destination_slug === params.destino &&
        b.category_slug === params.categoria,
    );
    return { resolution, items };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [], links: [], scripts: [] };
    const { resolution } = loaderData;
    const dest = resolution.destination?.label ?? params.destino;
    const cat = resolution.category?.label ?? params.categoria;
    return buildPublicHead({
      title: `${cat} en ${dest} — Oriente Maya · ${SITE.name}`,
      description: `Descubre ${cat.toLowerCase()} en ${dest}, Oriente Maya de Yucatán. Selección editorial de ${SITE.name}.`,
      path: `/oriente-maya/${params.destino}/${params.categoria}`,
      ogType: "website",
    });
  },
  component: CategoriaEnDestinoPage,
  notFoundComponent: () => (
    <PublicShell
      title="Categoría no disponible"
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label: "—" },
      ]}
    >
      <p className="text-sm text-muted-foreground">
        Aún no publicamos esta categoría en este destino.
      </p>
    </PublicShell>
  ),
});

function CategoriaEnDestinoPage() {
  const { resolution, items } = Route.useLoaderData();
  const { destino, categoria } = Route.useParams();
  const ctx = resolutionToNavigationContext(resolution, destino);
  const crumbs = buildBreadcrumbs(ctx).map((c) => ({
    label: c.label,
    to: c.href,
  }));
  const destLabel = resolution.destination?.label ?? destino;
  const catLabel = resolution.category?.label ?? categoria;
  return (
    <PublicShell
      eyebrow={destLabel}
      title={`${catLabel} en ${destLabel}`}
      description={`Empresas y experiencias de ${catLabel.toLowerCase()} en ${destLabel}, Oriente Maya de Yucatán.`}
      crumbs={crumbs}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no publicamos empresas de {catLabel.toLowerCase()} en {destLabel}.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((b: MarketplaceBusinessCard) => (
            <li
              key={b.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <Link
                to="/oriente-maya/$destino/$categoria/$empresa"
                params={{
                  destino,
                  categoria,
                  empresa: b.slug,
                }}
                className="text-base font-medium hover:underline"
              >
                {b.display_name}
              </Link>
              {b.tagline ? (
                <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground/80">
                {resolveCanonicalPath({
                  kind: "business",
                  slug: b.slug,
                  destination: destino,
                  category: categoria,
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}