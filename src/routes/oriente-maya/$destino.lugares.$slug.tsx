/**
 * G8-Q2D-B · Fase 2 — Ruta técnica de la ficha de Lugar y Atractivo.
 *
 * `/oriente-maya/{destino}/lugares/{lugar}`
 *
 * Estado autorizado: IMPLEMENTACIÓN TÉCNICA INACTIVA. Ningún lugar está
 * publicado, por lo que la ruta responde 404 público en todos los casos
 * reales de hoy. Reglas fail-closed:
 *  - draft, archivado, eliminado, territorio incompatible → 404 público.
 *  - Preview autenticada de staff → aviso “Borrador · no publicado”.
 *  - Nunca publica, nunca cambia estados, nunca crea redirects.
 *  - Sin sitemap y sin JSON-LD público mientras el lugar no esté publicado.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlacePremiumSurface } from "@/components/place-premium/PlacePremiumSurface";
import { PublicShell } from "@/components/discovery";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import {
  adaptPlaceToPremiumSurface,
  type PublicPlaceDTO,
} from "@/lib/places/place-public-contract";
import { getPublicPlace, getPlacePreview } from "@/lib/places/place-public-reads.functions";
import { useAuth } from "@/hooks/useAuth";
import { bindPlaceRoute } from "@/lib/experience-builder/canonical-entity-binding";
import { getEvaluationLotSlugs } from "@/lib/omxds/evaluation-lot.functions";
import { isInEvaluationLot } from "@/lib/omxds/evaluation-lot";

const SITE = "https://quehacerenvalladolid.com";

export const Route = createFileRoute("/oriente-maya/$destino/lugares/$slug")({
  loader: async ({ params }) => {
    const [place, evaluationLot] = await Promise.all([
      getPublicPlace({ data: { destinationSlug: params.destino, placeSlug: params.slug } }),
      // G8-R1-F1G/F1H · Lote interno de evaluación → noindex mientras dure.
      getEvaluationLotSlugs().catch(() => null),
    ]);
    return {
      place: place ?? null,
      inEvaluationLot: isInEvaluationLot(evaluationLot, "place", params.slug),
    };
  },
  head: ({ params, loaderData }) => {
    const place = loaderData?.place ?? null;
    const url = `${SITE}/oriente-maya/${params.destino}/lugares/${params.slug}`;
    if (!place) {
      return {
        meta: [
          { title: "Lugar no disponible · Oriente Maya" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const title = `${place.name} · ${place.destination.name} · Oriente Maya`;
    const description = place.shortDescription ?? `${place.name} en ${place.destination.name}.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (loaderData?.inEvaluationLot) {
      meta.push({ name: "robots", content: "noindex, nofollow" });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: PlaceRoute,
});

function PlaceRoute() {
  const { destino, slug } = Route.useParams();
  const { place } = Route.useLoaderData();
  const { user } = useAuth();
  const previewFn = useServerFn(getPlacePreview);

  /* Sólo se intenta la preview de staff cuando no hay ficha pública y hay
     sesión: para el visitante anónimo el borrador nunca existe. */
  const preview = useQuery({
    queryKey: ["place-preview", destino, slug],
    enabled: !place && Boolean(user),
    retry: false,
    queryFn: () => previewFn({ data: { destinationSlug: destino, placeSlug: slug } }),
  });

  const dto = (place ?? preview.data ?? null) as PublicPlaceDTO | null;
  const isDraft = Boolean(dto && dto.status !== "published");
  const projection = useMemo(() => (dto ? adaptPlaceToPremiumSurface(dto) : null), [dto]);
  /* G8-R1-C2 — el resolutor canónico acredita la familia `place` y delega
     íntegramente en `premium-entity-place` (seis variantes aprobadas). */
  const binding = useMemo(
    () => (dto ? bindPlaceRoute({ placeId: dto.id, placeType: dto.typeSlug }) : null),
    [dto],
  );

  if (!dto || !projection) {
    if (preview.isLoading) {
      return <div className="min-h-[50vh]" aria-busy="true" />;
    }
    return <PlaceNotFound />;
  }

  /* Shell público compartido (paridad exacta con eventos/hoteles):
     breadcrumb territorial y contenedor común provienen del sistema. */
  const crumbs = projection.content.breadcrumbs.map((c) => ({
    label: c.label,
    ...(c.href ? { to: c.href } : {}),
  }));

  return (
    <PublicShell crumbs={crumbs} variant="hero" compactCrumbsOnMobile>
      <div className="bg-background">
        <PlacePremiumSurface
          content={projection.content}
          presentation={projection.presentation}
          variant={binding?.variant ?? projection.variant ?? undefined}
          builderNotice={projection.resolution.builderNotice}
          draftNotice={isDraft ? "Borrador · no publicado" : null}
          showBreadcrumbs={false}
          aluxSlot={
            <TourismAluxPanel
              title="¿Cuándo estarás en la región?"
              description={`Alux combina ${dto.name} con mesas, hospedajes y experiencias cercanas sin romper el ritmo de tu viaje.`}
              task={`Ayúdame a integrar ${dto.name} en mi viaje por el Oriente Maya.`}
              prompts={projection.content.alux.prompts}
              compact
            />
          }
        />
      </div>
    </PublicShell>
  );
}

function PlaceNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Oriente Maya</p>
      <h1 className="font-serif text-2xl sm:text-3xl">Este lugar no está disponible</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        La ficha que buscas no existe, aún no está publicada o no pertenece a este destino.
      </p>
    </main>
  );
}
