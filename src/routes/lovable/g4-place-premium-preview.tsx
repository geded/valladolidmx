/**
 * Preview interna del perfil Premium de Lugar (noindex).
 *
 * A diferencia de la maqueta de evento, esta preview lee un lugar REAL
 * publicado (`points_of_interest`) por el mismo contrato que la ruta
 * pública `/oriente-maya/{destino}/lugares/{lugar}` y lo renderiza con la
 * misma superficie (`PlacePremiumSurface`, hero editorial dividido con
 * información a la izquierda y galería a la derecha, más Alux contextual).
 * `?lugar=` permite revisar cualquier ficha publicada de Valladolid.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlacePremiumSurface } from "@/components/place-premium/PlacePremiumSurface";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import {
  adaptPlaceToPremiumSurface,
  type PublicPlaceDTO,
} from "@/lib/places/place-public-contract";
import { getPublicPlace } from "@/lib/places/place-public-reads.functions";

export const Route = createFileRoute("/lovable/g4-place-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { lugar?: string } =>
    typeof search.lugar === "string" && search.lugar ? { lugar: search.lugar } : {},
  loaderDeps: ({ search }) => ({ lugar: search.lugar ?? "cenote-zaci" }),
  head: () => ({
    meta: [
      { title: "Lugar Premium · Revisión visual" },
      {
        name: "description",
        content: "Revisión responsive del perfil Premium de lugar con datos reales.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => {
    const place = await getPublicPlace({
      data: { destinationSlug: "valladolid", placeSlug: deps.lugar },
    }).catch(() => null);
    return { place: (place ?? null) as PublicPlaceDTO | null, lugar: deps.lugar };
  },
  component: PlacePremiumPreview,
});

function PlacePremiumPreview() {
  const { place, lugar } = Route.useLoaderData();
  const projection = useMemo(
    () => (place ? adaptPlaceToPremiumSurface(place) : null),
    [place],
  );

  if (!place || !projection) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Revisión visual</p>
        <h1 className="font-serif text-2xl sm:text-3xl">Lugar no disponible</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          No existe un lugar publicado con el slug “{lugar}” en Valladolid. Usa
          `?lugar=convento-san-bernardino`, `?lugar=calzada-de-los-frailes`,
          `?lugar=cenote-zaci`, `?lugar=cenote-suytun` o `?lugar=cenote-ik-kil`.
        </p>
      </main>
    );
  }

  return (
    <PlacePremiumSurface
      content={projection.content}
      presentation={projection.presentation}
      variant={projection.variant ?? undefined}
      builderNotice={projection.resolution.builderNotice}
      aluxSlot={
        <TourismAluxPanel
          title="¿Cuándo estarás en la región?"
          description={`Alux combina ${place.name} con mesas, hospedajes y experiencias cercanas sin romper el ritmo de tu viaje.`}
          task={`Ayúdame a integrar ${place.name} en mi viaje por el Oriente Maya.`}
          prompts={projection.content.alux.prompts}
          compact
        />
      }
    />
  );
}
