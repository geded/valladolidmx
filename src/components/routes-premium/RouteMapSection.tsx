/**
 * `RouteMapSection` — mapa de marca de una ruta editorial dentro de su ficha.
 *
 * Reutiliza el componente de mapa oficial (`InteractiveMap`) con la misma
 * cartografía territorial Valladolid.mx que la portada. Las paradas provienen
 * exclusivamente de `editorial_route_stops` con coordenadas acreditadas: una
 * parada sin ubicación publicada simplemente no se dibuja.
 */
import { useMemo, useState } from "react";

import { InteractiveMap, type MapRouteStatus } from "@/components/maps/InteractiveMap";
import { PremiumSectionHead } from "@/components/home-premium/shared/PremiumShowcase";
import type { EditorialRouteStopDTO } from "@/lib/routes-editorial/route-public-contract";

export interface RouteMapStop {
  id: string;
  title: string;
  lat: number;
  lng: number;
  href: string | null;
}

export function routeMapStops(stops: readonly EditorialRouteStopDTO[]): RouteMapStop[] {
  return stops
    .filter(
      (stop) =>
        typeof stop.lat === "number" &&
        Number.isFinite(stop.lat) &&
        typeof stop.lng === "number" &&
        Number.isFinite(stop.lng),
    )
    .map((stop) => ({
      id: stop.id,
      title: stop.title,
      lat: stop.lat as number,
      lng: stop.lng as number,
      href: stop.href,
    }));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function googleDirectionsUrl(stops: RouteMapStop[]): string {
  const origin = stops[0]!;
  const destination = stops[stops.length - 1]!;
  const waypoints = stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`);
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function RouteMapSection({
  stops,
  durationDays,
  selectedStopId,
  onSelectStop,
}: {
  stops: RouteMapStop[];
  durationDays: number | null;
  selectedStopId?: string | null;
  onSelectStop?: (id: string) => void;
}) {
  const [status, setStatus] = useState<MapRouteStatus | null>(null);

  const center = useMemo(() => {
    const lat = stops.reduce((sum, s) => sum + s.lat, 0) / stops.length;
    const lng = stops.reduce((sum, s) => sum + s.lng, 0) / stops.length;
    return { lat, lng };
  }, [stops]);

  if (stops.length === 0) return null;

  const metrics: Array<{ label: string; value: string }> = [
    { label: "Paradas en el mapa", value: String(stops.length) },
  ];
  if (durationDays && durationDays > 0)
    metrics.push({
      label: "Duración sugerida",
      value: durationDays === 1 ? "1 día" : `${durationDays} días`,
    });
  if (status?.mode === "directions" && status.distanceMeters)
    metrics.push({ label: "Distancia en auto", value: formatDistance(status.distanceMeters) });
  if (status?.mode === "directions" && status.durationSeconds)
    metrics.push({ label: "Tiempo en auto", value: formatDuration(status.durationSeconds) });

  return (
    <section aria-labelledby="ruta-mapa" className="space-y-4">
      <PremiumSectionHead
        id="ruta-mapa"
        kicker="Territorio"
        title="Mira la ruta en el mapa"
        description="Paradas publicadas, en su orden real, sobre la cartografía del Oriente Maya."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <InteractiveMap
          lat={center.lat}
          lng={center.lng}
          zoom={11}
          className="h-[320px] w-full sm:h-[420px]"
          markers={stops.map((stop, index) => ({
            lat: stop.lat,
            lng: stop.lng,
            title: stop.title,
            href: stop.href,
            key: stop.id,
            order: index + 1,
          }))}
          routeStops={stops.map((stop) => ({ lat: stop.lat, lng: stop.lng, key: stop.id }))}
          connectByRoad
          routeEmphasis="prominent"
          fitPadding={36}
          onRouteStatus={setStatus}
          {...(onSelectStop ? { onMarkerSelect: onSelectStop } : {})}
        />

        <div className="space-y-3 border-t border-border p-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="font-display text-base">{metric.value}</dd>
              </div>
            ))}
          </dl>

          {status?.mode === "none" ? (
            <p className="text-xs text-muted-foreground">
              El recorrido por carretera no está disponible en este momento. Conservamos las
              paradas publicadas y puedes abrir la ruta completa en “Cómo llegar”.
            </p>
          ) : null}

          <a
            href={googleDirectionsUrl(stops)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary"
          >
            Cómo llegar
          </a>
        </div>
      </div>

      {selectedStopId ? <span className="sr-only">Parada seleccionada en el mapa.</span> : null}
    </section>
  );
}
