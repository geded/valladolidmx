import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/oriente-maya/")({
  head: () =>
    buildPublicHead({
      title: `Oriente Maya — Destinos · ${SITE.name}`,
      description: ORIENTE_MAYA.short_description,
      path: "/oriente-maya",
    }),
  component: OrienteMayaIndex,
});

function OrienteMayaIndex() {
  return (
    <PublicShell
      eyebrow="Región turística"
      title={ORIENTE_MAYA.name}
      description={ORIENTE_MAYA.short_description}
      crumbs={[{ label: ORIENTE_MAYA.name }]}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DESTINOS_MOCK.filter((d) => d.region_slug === ORIENTE_MAYA.slug).map((d) => (
          <DestinoCard key={d.id} destination={d} />
        ))}
      </div>
    </PublicShell>
  );
}
