import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedEvents, type PublicEventCard } from "@/lib/events/public-reads.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/eventos")({
  head: () =>
    buildPublicHead({
      title: `Eventos · ${SITE.name}`,
      description: "Fiestas, festivales y celebraciones del calendario maya.",
      path: "/eventos",
    }),
  loader: async () => {
    const events = await listPublishedEvents({ data: { upcomingOnly: true, limit: 60 } }).catch(() => []);
    return { events };
  },
  component: EventosPage,
});

function fmt(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(iso));
  } catch { return iso; }
}

function EventosPage() {
  const { events } = Route.useLoaderData() as { events: PublicEventCard[] };
  return (
    <PublicShell
      eyebrow="Categoría"
      title="Eventos"
      description="Fiestas, festivales y celebraciones del calendario maya."
      crumbs={[{ label: "Eventos" }]}
    >
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <h2 className="text-2xl">Aún no hay eventos publicados</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Estamos armando el calendario de fiestas, festivales y celebraciones.
            Vuelve pronto o explora los hoteles, restaurantes y experiencias del Oriente Maya.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-2xl border border-border bg-card overflow-hidden transition hover:border-primary">
              <Link to="/eventos/$slug" params={{ slug: e.slug }} className="block">
                {e.cover_url ? (
                  <img src={e.cover_url} alt={e.title} loading="lazy" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video w-full bg-muted/40" />
                )}
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {fmt(e.starts_at)}{e.ends_at ? ` – ${fmt(e.ends_at)}` : ""}
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{e.title}</h3>
                  {e.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.summary}</p>
                  ) : null}
                  {e.venue_name ? (
                    <p className="mt-2 text-xs text-muted-foreground">{e.venue_name}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
