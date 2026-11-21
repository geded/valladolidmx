/**
 * /viaje-compartido/$token — US-E4.3 · Vista pública read-only del expediente.
 *
 * Reglas Founder:
 *  · Superficie pública (Discovery Layer); sin auth.
 *  · Sólo lee vía getSharedPlan (RPC SECURITY DEFINER filtra campos).
 *  · Itinerario con marca (TripItineraryDocument): días, horas, cómo llegar,
 *    paradas hechas en el teléfono y PDF nativo (window.print) con logotipo.
 *  · No expone user_id, notes privadas del plan, ni acciones de edición.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getSharedPlan, type SharedPlanView } from "@/lib/traveler/travel-plans.functions";
import { getSharedPlanItemsGeo } from "@/lib/traveler/travel-plan-geo.functions";
import { buildItineraryModel } from "@/lib/traveler/itinerary-document";
import { TripItineraryDocument } from "@/components/traveler/TripItineraryDocument";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sharedPlanQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared-plan", token],
    queryFn: async () => {
      const result = await getSharedPlan({ data: { token } });
      if (!result) throw notFound();
      return result;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/viaje-compartido/$token")({
  loader: async ({ params, context }) => {
    if (!UUID_RE.test(params.token)) throw notFound();
    return context.queryClient.ensureQueryData(sharedPlanQuery(params.token));
  },
  head: ({ loaderData }) => {
    const title = loaderData?.plan.title ?? "Itinerario de viaje";
    const count = loaderData?.items.length ?? 0;
    const desc = `Itinerario de viaje con ${count} parada${count === 1 ? "" : "s"} por el Oriente Maya de Yucatán.`;
    return {
      meta: [
        { title: `${title} · Valladolid.mx` },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SharedPlanPage,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : "Error"} />
  ),
  notFoundComponent: () => <NotFoundState />,
});

function SharedPlanPage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(sharedPlanQuery(token));
  return <SharedPlanView data={data} token={token} />;
}

/* ------------------------------------------------------------------ */
/* Render · Itinerario con marca (autoridad única TripItineraryDocument) */
/* ------------------------------------------------------------------ */

function SharedPlanView({ data, token }: { data: SharedPlanView; token: string }) {
  const { plan, items } = data;
  const geoQ = useQuery({
    queryKey: ["shared-plan", token, "geo"],
    queryFn: () => getSharedPlanItemsGeo({ data: { token } }),
    staleTime: 5 * 60_000,
  });
  const model = useMemo(() => {
    const geo = new Map<string, { lat: number; lng: number }>();
    for (const g of geoQ.data?.geo ?? []) geo.set(g.item_id, { lat: g.lat, lng: g.lng });
    return buildItineraryModel(items, { startDate: plan.start_date, geo });
  }, [items, plan.start_date, geoQ.data]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  useEffect(() => {
    setShareUrl(`${window.location.origin}/viaje-compartido/${token}`);
  }, [token]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 print:hidden">
        <Link
          to="/arma-tu-viaje"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Arma tu viaje
        </Link>
      </div>
      <TripItineraryDocument
        planId={plan.id}
        title={plan.title}
        startDate={plan.start_date}
        endDate={plan.end_date}
        partySize={plan.party_size}
        model={model}
        shareUrl={shareUrl}
        footerNote="Itinerario compartido por su autor; los horarios pueden cambiar. Para reservar o coordinar servicios, contacta a un Concierge humano desde Valladolid.mx."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fallbacks                                                           */
/* ------------------------------------------------------------------ */

function NotFoundState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Expediente no disponible</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El link puede haber sido revocado por su autor o el token no es válido.
      </p>
      <Link
        to="/arma-tu-viaje"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Arma tu viaje
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">No pudimos cargar el expediente</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
