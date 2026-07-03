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
import { getEventBySlug } from "@/lib/events/public-reads.functions";
import { EventSurface } from "@/components/surfaces/EventSurface";

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
  return <EventSurface event={event} />;
}