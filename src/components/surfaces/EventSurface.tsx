/**
 * Sprint Reconciliación 4 · Eventos v1 — EventSurface.
 *
 * Ficha pública de evento (`/eventos/{slug}`). Sigue el patrón de
 * `DestinationSurface`: se monta directamente desde la ruta con los
 * datos DTO ya cargados. Reutiliza `PublicShell` y tipografía global,
 * sin crear registries ni bloques nuevos.
 */
import { PublicShell } from "@/components/discovery";
import { Link } from "@tanstack/react-router";
import type { PublicEventDetail } from "@/lib/events/public-reads.functions";

function fmt(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

export function EventSurface({ event }: { event: PublicEventDetail }) {
  const when = event.ends_at
    ? `${fmt(event.starts_at)} – ${fmt(event.ends_at)}`
    : fmt(event.starts_at);
  return (
    <PublicShell
      eyebrow="Evento"
      title={event.title}
      description={event.summary ?? undefined}
      crumbs={[{ label: "Eventos", to: "/eventos" }, { label: event.title }]}
      useContextCrumbs
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {event.cover_url ? (
            <img
              src={event.cover_url}
              alt={event.title}
              className="aspect-video w-full rounded-2xl border border-border/60 object-cover"
              loading="eager"
            />
          ) : (
            <div className="aspect-video w-full rounded-2xl border border-dashed border-border bg-muted/30" />
          )}
          {event.summary ? (
            <p className="text-base leading-relaxed text-foreground/90">{event.summary}</p>
          ) : null}
          {event.body ? (
            <div className="whitespace-pre-line text-base leading-relaxed text-foreground/90">
              {event.body}
            </div>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cuándo
            </p>
            <p className="mt-1">{when || "Por confirmar"}</p>
            {event.venue_name ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dónde
                </p>
                <p className="mt-1">{event.venue_name}</p>
              </>
            ) : null}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrada
            </p>
            <p className="mt-1">{event.is_free ? "Gratuita" : "De paga"}</p>
            {event.external_url ? (
              <a
                href={event.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Más información
              </a>
            ) : null}
          </div>
          {event.destination_slug && event.destination_name ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Destino
              </p>
              <Link
                to="/oriente-maya/$destino"
                params={{ destino: event.destination_slug }}
                className="mt-1 block text-primary hover:underline"
              >
                {event.destination_name}
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </PublicShell>
  );
}