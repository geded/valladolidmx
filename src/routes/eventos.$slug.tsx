/**
 * Sprint Reconciliación 4 · Eventos v1 — Detalle público.
 *
 * `/eventos/{slug}`. Ruta canónica declarada por page-kind-registry
 * (`event.publicRoutePattern = /eventos/{slug}`). Sigue el patrón de
 * `/oriente-maya/$destino`: SSR read-only + fallback controlado.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import {
  buildPublicHead,
  eventJsonLd,
  businessEntityId,
} from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  getEventBySlug,
  type PublicEventDetail,
} from "@/lib/events/public-reads.functions";
import { EventSurface } from "@/components/surfaces/EventSurface";
import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

/**
 * H-02 · I6 — Declaración de contexto de la ficha de evento.
 *
 * · `inherit: ["region","destination","category"]` enriquece cuando el
 *   visitante llega desde una región, destino o categoría.
 * · `kindDefaults` preserva el breadcrumb legacy en el acceso directo:
 *   "Inicio › Eventos › [Evento]".
 */
function buildEventContext(e: PublicEventDetail): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "event",
      slug: e.slug,
      label: e.title,
      href: `/eventos/${e.slug}`,
    },
    inherit: ["region", "destination", "category"],
    canonical: `/eventos/${e.slug}`,
    kindDefaults: [
      { kind: "site_section", label: "Eventos", href: "/eventos" },
    ],
  });
}

export const Route = createFileRoute("/eventos/$slug")({
  loader: async ({ params }) => {
    const event = await getEventBySlug({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return buildPublicHead({
        title: "Evento no disponible",
        description: "Este evento no existe o aún no ha sido publicado.",
        path: `/eventos/${params.slug}`,
        noindex: true,
      });
    }
    const e = loaderData.event;
    // SEO.A1.1 · PR-3 — Event JSON-LD basado exclusivamente en datos
    // publicados y visibles en la página. `venue_name` sólo se emite si
    // el CMS lo publicó (nunca se inventa dirección). El editor puede
    // marcar cancelación/reprogramación en el futuro; hoy sólo emitimos
    // eventos activos ("EventScheduled") — este loader ya filtra por
    // `status='published'` y `deleted_at IS NULL`.
    // SEO.A1.1 · PR-3 (Founder Acceptance Review) — Organizer sólo se
    // emite con evidencia canónica: si el evento fue publicado con una
    // empresa organizadora real y publicada, referenciamos su `@id`;
    // si no hay evidencia, omitimos `organizer`. Prohibido usar
    // ORG_ID como fallback genérico — Valladolid.mx no organiza
    // eventos de terceros.
    const organizerBusinessPath =
      e.organizer_business_slug &&
      e.organizer_destination_slug &&
      e.organizer_category_slug
        ? `/oriente-maya/${e.organizer_destination_slug}/${e.organizer_category_slug}/${e.organizer_business_slug}`
        : null;
    const organizerId = organizerBusinessPath
      ? businessEntityId(organizerBusinessPath)
      : undefined;
    const organizerName =
      !organizerId && e.organizer_business_name
        ? e.organizer_business_name
        : undefined;
    const eventNode = eventJsonLd({
      name: e.title,
      description: e.summary,
      path: `/eventos/${e.slug}`,
      image: e.cover_url,
      startDate: e.starts_at,
      endDate: e.ends_at,
      eventStatus: "EventScheduled",
      eventAttendanceMode: "Offline",
      venueName: e.venue_name,
      addressLocality: e.destination_name ?? "Valladolid",
      externalUrl: e.external_url,
      isFree: e.is_free,
      organizerId,
      organizerName,
    });
    return buildPublicHead({
      title: `${e.title} · Eventos — ${SITE.name}`,
      description: e.summary ?? `Evento en ${SITE.name}: ${e.title}.`,
      path: `/eventos/${e.slug}`,
      ogType: "article",
      ogImage: e.cover_url ?? undefined,
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Eventos", path: "/eventos" },
        { label: e.title, path: `/eventos/${e.slug}` },
      ],
      jsonLd: [eventNode],
    });
  },
  component: EventoPage,
  notFoundComponent: () => (
    <PublicShell
      title="Evento no encontrado"
      crumbs={[{ label: "Eventos", to: "/eventos" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">No publicamos ese evento todavía.</p>
    </PublicShell>
  ),
  errorComponent: ({ error }) => (
    <PublicShell
      title="Evento no disponible"
      crumbs={[{ label: "Eventos", to: "/eventos" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
});

function EventoPage() {
  const { event } = Route.useLoaderData();
  const declaration = buildEventContext(event);
  return (
    <ContextEngineProvider declaration={declaration}>
      <EventSurface event={event} />
    </ContextEngineProvider>
  );
}