/**
 * ListingMapHeader — Mapa compacto (sin aside) para encabezar listados
 * turísticos (`/oriente-maya/:destino/:categoria`). Reutiliza StaticMap
 * y (bajo demanda) InteractiveMap. No duplica cards: la lista vive en
 * el grid de tarjetas debajo.
 */
import { lazy, Suspense, useMemo } from "react";
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((m) => ({
    default: m.InteractiveMap,
  })),
);

export interface ListingMapHeaderProps {
  heading?: string | null;
  points: ExperienceMapPoint[];
}

export function ListingMapHeader({ heading, points }: ListingMapHeaderProps) {
  const center = useMemo(() => {
    if (points.length === 0) return null;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng, zoom: points.length === 1 ? 15 : 13 };
  }, [points]);

  if (!center) return null;

  return (
    <section className="space-y-3">
      {heading ? (
        <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      ) : null}
      <Suspense
        fallback={
          <div className="h-[320px] w-full animate-pulse rounded-2xl bg-muted md:h-[420px]" />
        }
      >
        <InteractiveMap
          lat={center.lat}
          lng={center.lng}
          zoom={center.zoom}
          markerTitle={points[0].title}
          markers={points.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            title: p.title,
            href: null,
          }))}
          className="h-[320px] w-full rounded-2xl border border-border md:h-[420px]"
        />
      </Suspense>
    </section>
  );
}