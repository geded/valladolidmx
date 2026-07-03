/**
 * /oriente-maya — Región Oriente Maya (SSR).
 *
 * US-R3 · Ola 2 · Sub-ola 2.1: la vista de la Región ahora se sirve
 * desde el Experience Builder resolviendo la plantilla oficial por
 * `kind = region` (slug interno `__tpl_region__`). Fallback seguro
 * a `<RegionSurface />` (misma UI) si la composición no está publicada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { RegionSurface } from "@/components/surfaces/RegionSurface";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";

export const Route = createFileRoute("/oriente-maya/")({
  loader: async () => {
    const [composition, destinations] = await Promise.all([
      getPublishedCompositionBySlug({ data: { slug: "__tpl_region__" } }).catch(() => null),
      listPublishedDestinations().catch(() => []),
    ]);
    return { composition, destinations };
  },
  head: () =>
    buildPublicHead({
      title: `Oriente Maya — Destinos · ${SITE.name}`,
      description: ORIENTE_MAYA.short_description,
      path: "/oriente-maya",
    }),
  component: OrienteMayaIndex,
  errorComponent: () => (
    <PublicShell title={ORIENTE_MAYA.name} crumbs={[{ label: ORIENTE_MAYA.name }]}>
      <RegionSurface />
    </PublicShell>
  ),
});

function OrienteMayaIndex() {
  const { composition, destinations } = Route.useLoaderData();
  return composition ? (
    <CompositionRenderer tree={composition.snapshot} />
  ) : (
    <RegionSurface destinations={destinations} />
  );
}
