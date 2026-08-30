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
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { PremiumHero } from "@/components/premium";
import type { ReactNode } from "react";
import { createEventSurfaceContract } from "@/lib/omxds/surfaces/event-surface.contract";
import {
  isOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
} from "@/lib/omxds/surfaces/surface-contract";

function fmt(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export interface EventSurfaceContractBoundaryProps {
  enabled: boolean;
  event: PublicEventDetail | null;
  legacy: ReactNode;
}

export function EventSurfaceContractBoundary({
  enabled,
  event,
  legacy,
}: EventSurfaceContractBoundaryProps) {
  if (!enabled || !event) return legacy;
  const surfaceContract = createEventSurfaceContract({
    id: event.id,
    slug: event.slug,
    title: event.title,
    startsAt: event.starts_at,
    hasMedia: Boolean(event.cover_url),
    hasOrganizer: Boolean(event.organizer_business_slug || event.organizer_business_name),
  });
  if (!surfaceContract) return legacy;
  return <EventSurface event={event} surfaceContract={surfaceContract} />;
}

export function EventSurface({
  event,
  surfaceContract,
}: {
  event: PublicEventDetail;
  surfaceContract?: OmxdsSurfaceContract;
}) {
  const when = event.ends_at
    ? `${fmt(event.starts_at)} – ${fmt(event.ends_at)}`
    : fmt(event.starts_at);
  const activeContract =
    surfaceContract && isOmxdsSurfaceContract(surfaceContract) && surfaceContract.family === "event"
      ? surfaceContract
      : null;
  // TP1.4B · Universal "Agregar a Mi Viaje" en la ficha canónica de
  // evento. Reutiliza exclusivamente la política centralizada
  // (`evaluateTripEligibility`) + botón oficial + store reactivo.
  // Identidad = UUID canónico (`event.id`). Prohibido usar slug.
  const tripEligibility = evaluateTripEligibility({
    kind: "event",
    targetId: event.id,
    title: event.title,
  });
  const dominantAction = activeContract?.actions.find(
    (action) => action.role === "dominant" && action.id === "add_to_trip",
  );
  const showTripAction =
    tripEligibility.eligible &&
    tripEligibility.identity &&
    (!activeContract || Boolean(dominantAction));
  return (
    <PublicShell
      eyebrow={activeContract ? undefined : "Evento"}
      title={activeContract ? undefined : event.title}
      description={activeContract ? undefined : (event.summary ?? undefined)}
      crumbs={[{ label: "Eventos", to: "/eventos" }, { label: event.title }]}
      useContextCrumbs
    >
      {activeContract ? (
        <PremiumHero
          vm={{
            presentation: event.cover_url ? "cinematic" : "editorial",
            crumbs: [
              { label: "Inicio", href: "/" },
              { label: "Oriente Maya de Yucatán", href: "/oriente-maya" },
              ...(event.destination_slug && event.destination_name
                ? [
                    {
                      label: event.destination_name,
                      href: `/oriente-maya/${encodeURIComponent(event.destination_slug)}`,
                    },
                  ]
                : []),
              { label: "Eventos", href: "/eventos" },
              { label: event.title },
            ],
            eyebrow: when ? `Evento · ${when}` : "Evento",
            title: event.title,
            description: event.summary ?? undefined,
            media:
              event.cover_url && !activeContract.omissions.includes("media")
                ? { url: event.cover_url, alt: event.title }
                : null,
          }}
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {!activeContract ? (
            event.cover_url ? (
              <img
                src={event.cover_url}
                alt={event.title}
                className="aspect-video w-full rounded-2xl border border-border/60 object-cover"
                loading="eager"
              />
            ) : (
              <div className="aspect-video w-full rounded-2xl border border-dashed border-border bg-muted/30" />
            )
          ) : null}
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
            {!activeContract?.omissions.includes("price") ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Entrada
                </p>
                <p className="mt-1">{event.is_free ? "Gratuita" : "De paga"}</p>
              </>
            ) : null}
            {showTripAction && tripEligibility.identity ? (
              <div className="mt-5">
                <AddToTravelPlanButton
                  kind={tripEligibility.identity.kind}
                  targetId={tripEligibility.identity.targetId}
                  title={event.title}
                  slug={event.slug ?? null}
                  imageUrl={event.cover_url ?? null}
                  subtitle={when || null}
                />
              </div>
            ) : null}
            {!activeContract && event.external_url ? (
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
