/**
 * EventosSection — Próximos eventos publicados.
 *
 * Sprint Reconciliación 6 · Home conectada al ecosistema.
 * Reutiliza `listPublishedEvents` (Sprint 4) sin backend nuevo.
 * Si no hay eventos próximos, la sección no se renderiza: no
 * dejamos placeholders en Home.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { listPublishedEvents, type PublicEventCard } from "@/lib/events/public-reads.functions";

const DATE_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  try {
    return DATE_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function EventosSection({ config }: { config?: Record<string, unknown> } = {}) {
  const fetchEvents = useServerFn(listPublishedEvents);
  const { data } = useQuery({
    queryKey: ["home", "eventos", "upcoming"],
    queryFn: () => fetchEvents({ data: { limit: 6, upcomingOnly: true } }),
    staleTime: 5 * 60 * 1000,
  });
  const events: PublicEventCard[] = data ?? [];
  if (events.length === 0) return null;
  const title = typeof config?.heading === "string" && config.heading.trim() ? config.heading : "Próximos eventos";
  return (
    <section id="eventos" className="@container bg-secondary/40 py-20 @3xl:py-28">
      <Container>
        <SectionHeader
          eyebrow="Agenda"
          title={title}
          subtitle="Ferias, festivales y momentos vivos del Oriente Maya."
          actions={
            <Link
              to="/eventos"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Ver toda la agenda
            </Link>
          }
        />
        <ul data-home-grid="eventos" className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                to="/eventos/$slug"
                params={{ slug: e.slug }}
                className="group block h-full rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  {formatDate(e.starts_at)}
                  {e.is_free ? " · Gratis" : null}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary">
                  {e.title}
                </p>
                {e.venue_name ? (
                  <p className="mt-1 text-sm text-muted-foreground">{e.venue_name}</p>
                ) : null}
                {e.summary ? (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{e.summary}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}