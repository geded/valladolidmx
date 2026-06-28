import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/common/PageShell";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/oriente-maya/$destino")({
  loader: ({ params }) => {
    const dest = DESTINOS_MOCK.find(
      (d) => d.slug === params.destino && d.region_slug === ORIENTE_MAYA.slug,
    );
    if (!dest) throw notFound();
    return { dest };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.dest.name} — ${ORIENTE_MAYA.name} · ${SITE.name}` },
          { name: "description", content: loaderData.dest.tagline },
          { property: "og:title", content: `${loaderData.dest.name} — ${ORIENTE_MAYA.name}` },
          { property: "og:description", content: loaderData.dest.tagline },
        ]
      : [],
  }),
  component: DestinoPage,
  notFoundComponent: () => (
    <PageShell
      title="Destino no disponible"
      crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
    >
      <p className="text-muted-foreground">Aún no publicamos esta página de destino.</p>
    </PageShell>
  ),
});

function DestinoPage() {
  const { dest } = Route.useLoaderData();
  return (
    <PageShell
      eyebrow={ORIENTE_MAYA.name}
      title={dest.name}
      description={dest.tagline}
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: dest.name },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlaceholderImage palette={dest.hero_palette} label={dest.name} aspect="video" />
          <div className="mt-8">
            <h2 className="text-2xl">Lo esencial</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {dest.highlights.map((h) => (
                <li
                  key={h}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Próximamente en este destino</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· Hoteles del destino</li>
              <li>· Restaurantes recomendados</li>
              <li>· Experiencias y rutas</li>
              <li>· Reseñas resumidas por Alux</li>
            </ul>
            <div className="mt-4">
              <ComingSoonBadge label="Fase 1" />
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
