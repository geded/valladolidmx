/**
 * /oriente-maya/{destino} — Ficha pública de Destino (SSR).
 *
 * US-R3 · Ola 2 · Sub-ola 2.1: la ficha se sirve desde el Experience
 * Builder resolviendo la plantilla oficial por `kind = destination`
 * (slug interno `__tpl_destination__`). El slug del destino se lee
 * dentro de la superficie desde el router. Fallback seguro a
 * `<DestinationSurface />` (misma UI) si la composición no existe.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { DestinationSurface } from "@/components/surfaces/DestinationSurface";
import { getPublicDestinationBySlug, getDestinationRelated } from "@/lib/destinations/public-reads.functions";

export const Route = createFileRoute("/oriente-maya/$destino")({
  loader: async ({ params }) => {
    const mock = DESTINOS_MOCK.find(
      (d) => d.slug === params.destino && d.region_slug === ORIENTE_MAYA.slug,
    );
    const [db, related] = await Promise.all([
      getPublicDestinationBySlug({ data: { slug: params.destino } }).catch(() => null),
      getDestinationRelated({ data: { slug: params.destino } }).catch(() => null),
    ]);
    if (!mock && !db) throw notFound();
    const dest = {
      slug: params.destino,
      name: db?.name ?? mock?.name ?? params.destino,
      tagline: db?.tagline ?? mock?.tagline ?? "",
      hero_palette: (db?.hero_palette ?? mock?.hero_palette ?? "territorio") as
        "territorio" | "selva" | "cenote" | "atardecer",
      highlights: (db?.highlights?.length ? db.highlights : mock?.highlights ?? []) as string[],
    };
    return { dest, db, related };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? buildPublicHead({
          title: `${loaderData.dest.name} — ${ORIENTE_MAYA.name} · ${SITE.name}`,
          description: loaderData.dest.tagline,
          path: `/oriente-maya/${params.destino}`,
          ogType: "place",
        })
      : { meta: [], links: [], scripts: [] },
  component: DestinoPage,
  notFoundComponent: () => (
    <PublicShell
      title="Destino no disponible"
      crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
    >
      <p className="text-muted-foreground">Aún no publicamos esta página de destino.</p>
    </PublicShell>
  ),
});

function DestinoPage() {
  const { db, related } = Route.useLoaderData();
  return <DestinationSurface dbData={db ?? undefined} related={related ?? undefined} />;
}
