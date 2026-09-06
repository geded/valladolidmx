/**
 * EventPremiumSurface — Ficha Premium de evento.
 *
 * Reutiliza el hero editorial compartido aprobado (texto y datos a la
 * izquierda, galería a la derecha), el shell público, el breadcrumb
 * territorial, Alux contextual y Mi Viaje. No expone selector de
 * presentación ni hero legacy: la autoridad visual es única.
 *
 * Todos los datos provienen de la lectura real (`getEventBySlug`).
 * Los atributos no capturados en el CMS simplemente no se muestran.
 */
import { ArrowRight, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { Container } from "@/components/layout/Container";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import type { PublicEventDetail } from "@/lib/events/public-reads.functions";
import { attributeValues, humanizeAttributeValue } from "@/lib/business-attributes/types";

function formatDay(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(date);
}

const TAG_KEYS = [
  "audience",
  "time_of_day",
  "venue_type",
  "accessibility",
  "reservation_required",
] as const;

export function EventPremiumSurface({ event }: { event: PublicEventDetail }) {
  const attrs = event.filter_attributes ?? {};
  const eventType = attributeValues(attrs.event_type)[0];
  const startDay = formatDay(event.starts_at);
  const endDay = formatDay(event.ends_at);
  const startTime = formatTime(event.starts_at);
  const endTime = formatTime(event.ends_at);
  const admission = attributeValues(attrs.admission_type)[0];

  const facts = [
    startDay
      ? {
          icon: CalendarDays,
          label: "Fecha",
          value: endDay && endDay !== startDay ? `${startDay} – ${endDay}` : startDay,
        }
      : null,
    startTime
      ? {
          icon: Clock3,
          label: "Horario",
          value: endTime ? `${startTime}–${endTime} h` : `${startTime} h`,
        }
      : null,
    event.venue_name ? { icon: MapPin, label: "Sede", value: event.venue_name } : null,
    {
      icon: Ticket,
      label: "Acceso",
      value: admission
        ? humanizeAttributeValue(admission)
        : event.is_free
          ? "Entrada libre"
          : "Entrada de pago",
    },
  ].filter(Boolean) as { icon: typeof CalendarDays; label: string; value: string }[];

  const tags = TAG_KEYS.flatMap((key) =>
    attributeValues(attrs[key]).map((value) => humanizeAttributeValue(value)),
  );

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
      <div className="bg-[#f7f2e8] pb-16 text-[#17251f]">
        <Container className="pt-4 sm:pt-6">
          <section className="grid gap-7 overflow-hidden rounded-[2rem] border border-[#ded7c9] bg-white p-5 shadow-elevated sm:p-7 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:p-9">
            <div className="order-2 lg:order-1">
              <div className="flex flex-wrap items-center gap-2">
                {eventType ? (
                  <span className="rounded-full border border-[#0d4b38]/25 bg-[#0d4b38]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[#0d4b38]">
                    {humanizeAttributeValue(eventType)}
                  </span>
                ) : null}
                {event.destination_name ? (
                  <span className="rounded-full border border-[#ded7c9] px-3 py-1 text-[11px] uppercase tracking-[.16em] text-[#667067]">
                    {event.destination_name} · Oriente Maya de Yucatán
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 font-display text-4xl leading-[1.04] tracking-tight sm:text-5xl">
                {event.title}
              </h1>
              {event.summary ? (
                <p className="mt-3 text-lg leading-7 text-[#4f5d54]">{event.summary}</p>
              ) : null}
              {facts.length ? (
                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                  {facts.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex min-w-0 items-start gap-2">
                      <Icon className="mt-0.5 size-4 shrink-0 text-[#ba641e]" aria-hidden />
                      <div>
                        <dt className="text-[10px] uppercase tracking-[.14em] text-[#788078]">
                          {label}
                        </dt>
                        <dd className="mt-0.5 font-semibold">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <AddToTravelPlanButton
                  kind="event"
                  targetId={event.id}
                  title={event.title}
                  slug={event.slug ?? null}
                  imageUrl={event.cover_url ?? null}
                  subtitle={startDay}
                  variant="full"
                />
                {event.external_url ? (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#0d4b38] px-7 text-sm font-semibold text-[#0d4b38]"
                  >
                    Más información <ArrowRight className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              {event.cover_url ? (
                <img
                  src={event.cover_url}
                  alt={event.title}
                  className="h-56 w-full rounded-3xl object-cover shadow-elevated sm:h-72 lg:h-[26rem]"
                  loading="eager"
                />
              ) : (
                <div className="h-56 w-full rounded-3xl border border-dashed border-[#ded7c9] bg-[#efe8da] sm:h-72 lg:h-[26rem]" />
              )}
            </div>
          </section>
        </Container>

        <Container className="mt-6 sm:mt-8">
          <TourismAluxPanel
            title="¿Qué fechas estarás en la región?"
            description="Alux combinará este evento con lugares, mesas y experiencias cercanas sin romper el ritmo de tu viaje."
            task={`Ayúdame a integrar ${event.title} en mi viaje por el Oriente Maya de Yucatán.`}
            prompts={[
              "Este fin de semana",
              "Ya estoy aquí",
              "En pareja",
              "En familia",
              "Con amigos",
            ]}
            compact
          />
        </Container>

        {event.body || tags.length ? (
          <Container className="mt-10 lg:mt-14">
            <section className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ba641e]">
                  La experiencia
                </p>
                <h2 className="mt-3 font-display text-4xl leading-tight">Qué vas a vivir</h2>
                {tags.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {event.body ? (
                <div className="whitespace-pre-line text-base leading-8 text-[#5d685f]">
                  {event.body}
                </div>
              ) : null}
            </section>
          </Container>
        ) : null}
      </div>
    </PublicShell>
  );
}
