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
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { DestinationSurface } from "@/components/surfaces/DestinationSurface";

export const Route = createFileRoute("/oriente-maya/$destino")({
  loader: async ({ params }) => {
    // Resolución por slug (H-R3-2 · Ola 2): validamos que el destino
    // exista antes de renderizar la plantilla; devuelve 404 real si no.
    const dest = DESTINOS_MOCK.find(
      (d) => d.slug === params.destino && d.region_slug === ORIENTE_MAYA.slug,
    );
    if (!dest) throw notFound();
    const composition = await getPublishedCompositionBySlug({
      data: { slug: "__tpl_destination__" },
    }).catch(() => null);
    return { dest, composition };
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
  const { composition } = Route.useLoaderData();
  return composition ? (
    <CompositionRenderer tree={composition.snapshot} />
  ) : (
    <DestinationSurface />
  );
}
