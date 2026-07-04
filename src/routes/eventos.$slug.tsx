/**
 * Sprint Reconciliación 4 · Eventos v1 — Detalle público.
 *
 * `/eventos/{slug}`. Ruta canónica declarada por page-kind-registry
 * (`event.publicRoutePattern = /eventos/{slug}`). Sigue el patrón de
 * `/oriente-maya/$destino`: SSR read-only + fallback controlado.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
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
    return buildPublicHead({
      title: `${e.title} · Eventos — ${SITE.name}`,
      description: e.summary ?? `Evento en ${SITE.name}: ${e.title}.`,
      path: `/eventos/${e.slug}`,
      ogType: "article",
      ogImage: e.cover_url ?? undefined,
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