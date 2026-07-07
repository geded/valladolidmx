/**
 * ListingMapHeader — Mapa compacto (sin aside) para encabezar listados
 * turísticos (`/oriente-maya/:destino/:categoria`). Reutiliza StaticMap
 * y (bajo demanda) InteractiveMap. No duplica cards: la lista vive en
 * el grid de tarjetas debajo.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaticMap } from "@/components/maps/StaticMap";
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
  const [interactive, setInteractive] = useState(false);

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
      {interactive ? (
        <Suspense
          fallback={
            <div className="h-[320px] w-full animate-pulse rounded-2xl bg-muted" />
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
      ) : (
        <StaticMap
          lat={center.lat}
          lng={center.lng}
          zoom={center.zoom}
          width={1024}
          height={420}
          alt={heading ?? "Mapa"}
          markers={points.map((p, i) => ({
            lat: p.lat,
            lng: p.lng,
            kind: p.kind,
            label: String.fromCharCode(65 + (i % 26)),
          }))}
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setInteractive((s) => !s)}
      >
        <MapIcon className="mr-2 h-4 w-4" aria-hidden />
        {interactive ? "Ver mapa estático" : "Ver mapa interactivo"}
      </Button>
    </section>
  );
}