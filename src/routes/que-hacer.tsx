/**
 * /que-hacer — Actividades editoriales del Oriente Maya (Sprint 5).
 *
 * Superficie editorial que combina destinos publicados y eventos próximos
 * reutilizando lecturas ya existentes. Sin backend nuevo.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import { listPublishedEvents, type PublicEventCard } from "@/lib/events/public-reads.functions";
import type { Destination } from "@/types/territory";

const TEMAS = [
  { slug: "cultura", label: "Cultura", description: "Museos, cenotes sagrados, comunidades mayas y rituales vivos." },
  { slug: "naturaleza", label: "Naturaleza", description: "Reservas, flamingos, selva baja y cielos estrellados." },
  { slug: "aventura", label: "Aventura", description: "Cenotes profundos, ciclismo entre pueblos y rutas menos transitadas." },
  { slug: "gastronomia", label: "Gastronomía", description: "Cocineras tradicionales, panuchos, recados y mercados." },
  { slug: "mercados", label: "Mercados", description: "Plazas, tianguis y ferias del calendario yucateco." },
];

export const Route = createFileRoute("/que-hacer")({
  validateSearch: (search: Record<string, unknown>) => ({
    tema: typeof search.tema === "string" ? search.tema : undefined,
  }),
  loader: async () => {
    const [destinos, eventos] = await Promise.all([
      listPublishedDestinations().catch(() => []),
      listPublishedEvents().catch(() => []),
    ]);
    return { destinos, eventos: eventos.slice(0, 6) };
  },
  head: () =>
    buildPublicHead({
      title: `¿Qué hacer? · ${SITE.name}`,
      description:
        "Ideas editoriales para vivir el Oriente Maya: cultura, naturaleza, aventura, gastronomía y eventos.",
      path: "/que-hacer",
    }),
  component: QueHacerRoute,
});

function QueHacerRoute() {
  const { destinos, eventos } = Route.useLoaderData();
  const { tema } = Route.useSearch();
  const activo = TEMAS.find((t) => t.slug === tema) ?? null;
  return (
    <PublicShell
      eyebrow="Editorial"
      title={activo ? `¿Qué hacer? · ${activo.label}` : "¿Qué hacer en el Oriente Maya?"}
      description={activo?.description ?? "Ideas editoriales para inspirar tu viaje."}
      crumbs={[
        { label: "¿Qué hacer?", to: "/que-hacer" },
        ...(activo ? [{ label: activo.label }] : []),
      ]}
    >
      <section className="mt-2">
        <h2 className="mb-4 text-xl font-semibold">Temas</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map((t) => (
            <li key={t.slug}>
              <Link
                to="/que-hacer"
                search={{ tema: t.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {destinos.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Elige un destino</h2>
          <ul className="flex flex-wrap gap-2">
            {destinos.slice(0, 24).map((d: Destination) => (
              <li key={d.slug}>
                <Link
                  to="/oriente-maya/$destino"
                  params={{ destino: d.slug }}
                  className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {eventos.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Próximos eventos</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {eventos.map((e: PublicEventCard) => (
              <li key={e.id}>
                <Link
                  to="/eventos/$slug"
                  params={{ slug: e.slug }}
                  className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent"
                >
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                  {e.venue_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">{e.venue_name}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link to="/eventos" className="text-primary hover:underline">
              Ver todos los eventos →
            </Link>
          </p>
        </section>
      ) : null}
    </PublicShell>
  );
}