/**
 * EventPremiumSurface — Ficha Premium de evento.
 *
 * Adaptada al mismo patrón visual de la familia Premium aprobada
 * (hoteles, restaurantes, casas de vacaciones): PremiumHero → fila de
 * acciones (compartir, guardar, agregar a Mi Viaje) → Alux → datos
 * clave → descripción → ubicación → eventos cercanos → CTA final.
 *
 * No crea superficie nueva ni componentes paralelos. Reutiliza
 * exclusivamente los bloques oficiales del Experience Builder y los
 * componentes compartidos vigentes. Sin reserva ni cobro en línea.
 */
import { useState, type ReactNode } from "react";
import { Share2 } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { PremiumHero } from "@/components/premium";
import { DEFAULT_PREMIUM_PRESENTATION } from "@/lib/omxds/presentation/presentation";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { ShareSheet } from "@/components/share/ShareSheet";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { BusinessLocationBlock } from "@/components/maps/BusinessLocationBlock";
import { TourismCard } from "@/components/experience-builder/tourism-card/TourismCard";
import type { ExperienceInfoGridDTO } from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import type { ExperienceSectionDTO } from "@/lib/experience-builder/blocks/experience-section/contract";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicEventDetail, PublicEventCard } from "@/lib/events/public-reads.functions";
import { attributeValues, humanizeAttributeValue } from "@/lib/business-attributes/types";
import { recurrenceLabel, scheduleLabel } from "@/lib/events/recurrence";

const EVENT_TIME_ZONE = "America/Merida";

function formatDay(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

function formatTime(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: EVENT_TIME_ZONE }).format(date);
}

function eventCardToVM(card: PublicEventCard): TourismCardVM {
  const startDay = formatDay(card.starts_at);
  return {
    id: card.id,
    entityKind: "event",
    name: card.title,
    href: `/eventos/${card.slug}`,
    tagline: card.summary,
    businessName: card.venue_name,
    mediaUrl: card.cover_url,
    mediaAlt: card.title,
    rating: null,
    location: card.destination_name ? { label: card.destination_name, distanceKm: null } : null,
    territorialContext: card.destination_name ?? null,
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: startDay,
    startsAt: card.starts_at,
    endsAt: card.ends_at,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: card.is_free ? "Entrada libre" : null,
    primaryAction: { label: "Ver evento", href: `/eventos/${card.slug}` },
    secondaryAction: null,
  };
}

export function EventPremiumSurface({
  event,
  related = [],
  readOnlyPreview = false,
  previewCover,
}: {
  event: PublicEventDetail;
  related?: PublicEventCard[];
  readOnlyPreview?: boolean;
  previewCover?: ReactNode;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  const attrs = event.filter_attributes ?? {};
  const eventType = attributeValues(attrs.event_type)[0];
  const startDay = formatDay(event.starts_at);
  const endDay = formatDay(event.ends_at);
  const startTime = formatTime(event.starts_at);
  const endTime = formatTime(event.ends_at);
  const admission = attributeValues(attrs.admission_type)[0];
  const recurrence = recurrenceLabel(event);
  const scheduledTimes = scheduleLabel(event.schedule_times);

  /* ---- InfoGrid: datos clave del evento ---- */
  const infoItems: ExperienceInfoGridDTO["items"] = [
    startDay
      ? {
          iconKey: "calendar",
          label: recurrence ? "Próxima función" : "Fecha",
          value: endDay && endDay !== startDay ? `${startDay} – ${endDay}` : startDay,
          tone: "default" as const,
        }
      : null,
    scheduledTimes || startTime
      ? {
          iconKey: "clock",
          label: "Horario",
          value: scheduledTimes ?? (endTime ? `${startTime}–${endTime} h` : `${startTime} h`),
          tone: "default" as const,
        }
      : null,
    event.venue_name
      ? { iconKey: "map-pin", label: "Sede", value: event.venue_name, tone: "default" as const }
      : null,
    {
      iconKey: "ticket",
      label: "Acceso",
      value: admission
        ? humanizeAttributeValue(admission)
        : event.is_free
          ? "Entrada libre"
          : "Entrada de pago",
      tone: "default" as const,
    },
    recurrence
      ? {
          iconKey: "repeat",
          label: "Recurrencia",
          value: `${recurrence}${event.recurrence_until ? ` · hasta ${formatDay(`${event.recurrence_until}T12:00:00-06:00`)}` : " · programación permanente"}`,
          tone: "primary" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const infoGridDto: ExperienceInfoGridDTO | null =
    infoItems.length > 0
      ? {
          variant: "cards",
          heading: "Datos del evento",
          columns: 3,
          items: infoItems,
          ariaLabel: "Información clave del evento",
          provenance: "published",
          capabilities: { copyable: false, livePricing: false, liveAvailability: false },
        }
      : null;

  /* ---- Section: descripción editorial ---- */
  const descriptionSection: ExperienceSectionDTO | null = event.body
    ? {
        variant: "editorial",
        eyebrow: "La experiencia",
        title: "Qué vas a vivir",
        lead: event.summary ?? null,
        body: event.body
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `<p>${p.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")}</p>`)
          .join(""),
        media: null,
        attribution: null,
        ctas: event.external_url
          ? [{ label: "Más información", href: event.external_url, emphasis: "secondary" }]
          : [],
        align: "left",
        tone: "default",
        ariaLabel: null,
        capabilities: { anchor: true, seoHeading: true, richText: true },
      }
    : null;

  const hasLocation =
    typeof event.latitude === "number" && typeof event.longitude === "number";

  const crumbs = [
    { label: "Oriente Maya", to: "/oriente-maya" as const },
    ...(event.destination_slug && event.destination_name
      ? [{ label: event.destination_name, to: `/oriente-maya/${event.destination_slug}` }]
      : []),
    { label: "Eventos", to: "/eventos" as const },
    { label: event.title },
  ];

  return (
    <PublicShell crumbs={crumbs} useContextCrumbs compactCrumbsOnMobile>
      {/* ---- Hero Premium (mismo bloque que hoteles/restaurantes/casas) ---- */}
      <PremiumHero
        layout="entity"
        vm={{
          presentation: DEFAULT_PREMIUM_PRESENTATION,
          eyebrow: eventType ? humanizeAttributeValue(eventType) : "Evento",
          title: event.title,
          description: event.summary ?? undefined,
          media: event.cover_url
            ? { url: event.cover_url, alt: event.title }
            : null,
          badges: event.destination_name
            ? [{ label: `${event.destination_name} · Oriente Maya`, tone: "neutral" as const }]
            : [],
        }}
      />

      {/* ---- Fila de acciones: compartir, guardar, agregar a Mi Viaje ---- */}
      <div className="mx-auto mt-4 flex w-full max-w-7xl justify-end gap-2 px-5 sm:px-8 lg:px-12">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShareOpen(true)}
          aria-label="Compartir evento"
          className="rounded-pill border border-border bg-background shadow-soft"
        >
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </Button>
        <ShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          title={event.title}
          url={typeof window !== "undefined" ? window.location.href : ""}
          text="Descubre este evento en el Oriente Maya."
          heading="Compartir evento"
        />
        {!readOnlyPreview ? (
          <AddToTravelPlanButton
            kind="event"
            targetId={event.id}
            title={event.title}
            slug={event.slug ?? null}
            imageUrl={event.cover_url ?? null}
            subtitle={startDay}
            variant="full"
          />
        ) : null}
      </div>

      {/* ---- Alux contextual ---- */}
      <TourismAluxPanel
        className="mx-auto mt-4 w-full max-w-7xl"
        title={`Planear con ${event.title}`}
        description="Alux te ayuda a integrar este evento en tu viaje por el Oriente Maya."
        task={`Ayúdame a integrar ${event.title} en mi viaje por el Oriente Maya.`}
        selection={{
          entityRef: `event:${event.id}`,
          title: event.title,
          ...(event.destination_slug ? { destinationSlug: event.destination_slug } : {}),
          ...(event.destination_slug ? { destinationLabel: event.destination_slug } : {}),
        }}
      />

      {/* ---- Datos clave del evento ---- */}
      {infoGridDto ? (
        <section data-eb-anchor className="mt-6 scroll-mt-24">
          <ExperienceInfoGrid dto={infoGridDto} />
        </section>
      ) : null}

      {/* ---- Descripción editorial ---- */}
      {descriptionSection ? (
        <section data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceSection dto={descriptionSection} />
        </section>
      ) : null}

      {/* ---- Ubicación / Cómo llegar ---- */}
      {hasLocation ? (
        <section id="ubicacion" data-eb-anchor className="mt-10 scroll-mt-24">
          <BusinessLocationBlock
            lat={event.latitude!}
            lng={event.longitude!}
            name={event.venue_name ?? event.title}
            presentation="premium"
            layout="stacked"
          />
        </section>
      ) : null}

      {/* ---- Eventos cercanos ---- */}
      {related.length > 0 ? (
        <section id="descubre" data-eb-anchor className="mx-auto mt-10 w-full max-w-7xl scroll-mt-24 px-5 sm:px-8 lg:px-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Explora cerca de {event.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Otros eventos del destino para continuar tu viaje por el Oriente Maya.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((card) => (
              <TourismCard
                key={card.id}
                vm={eventCardToVM(card)}
                capabilities={{
                  showMedia: true,
                  showEyebrow: false,
                  showBusiness: true,
                  showTagline: true,
                  showRating: false,
                  showLocation: true,
                  showDistance: false,
                  showTerritorialContext: false,
                  showHighlights: false,
                  showBadges: false,
                  showInstitutionalBadges: false,
                  showDate: true,
                  showAvailability: false,
                  showPrice: false,
                  showPrimaryAction: false,
                  showSecondaryAction: false,
                  showFavorite: false,
                  showRationale: false,
                  compact: true,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- CTA final ---- */}
      <section className="mx-auto mt-10 w-full max-w-7xl px-5 pb-4 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">
              Suma {event.title} a tu viaje
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Un concierge arma tu itinerario incluyendo este evento. Sin cobro en línea.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!readOnlyPreview ? (
              <AddToTravelPlanButton
                kind="event"
                targetId={event.id}
                title={event.title}
                slug={event.slug ?? null}
                imageUrl={event.cover_url ?? null}
                subtitle={startDay}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShareOpen(true)}
              aria-label="Compartir evento"
              className="rounded-pill border border-border bg-background shadow-soft"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
