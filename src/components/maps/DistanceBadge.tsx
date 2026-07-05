/**
 * DistanceBadge — "a X km · Y min en auto" desde la ubicación del
 * visitante hacia el destino. Server-first: la ruta se calcula con
 * Routes API vía gateway.
 *
 * Si el visitante no compartió ubicación, muestra CTA "Compartir mi
 * ubicación". Si comparte, dispara el cálculo y muestra el resultado.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { computeRoute } from "@/lib/maps/maps.functions";
import { useVisitorGeolocation } from "./useVisitorGeolocation";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function DistanceBadge({
  destLat,
  destLng,
}: {
  destLat: number;
  destLng: number;
}) {
  const { location, status, request } = useVisitorGeolocation();
  const fn = useServerFn(computeRoute);

  const { data, isLoading, isError } = useQuery({
    enabled: Boolean(location),
    staleTime: 1000 * 60 * 60 * 24,
    queryKey: [
      "maps",
      "route",
      location?.lat,
      location?.lng,
      destLat,
      destLng,
    ],
    queryFn: () =>
      fn({
        data: {
          originLat: location!.lat,
          originLng: location!.lng,
          destLat,
          destLng,
          travelMode: "DRIVE",
        },
      }),
  });

  if (!location) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" aria-hidden />
        <span>¿Qué tan lejos estás?</span>
        <Button
          size="sm"
          variant="outline"
          onClick={request}
          disabled={status === "prompting"}
        >
          {status === "prompting"
            ? "Solicitando…"
            : status === "denied"
              ? "Permiso denegado"
              : status === "unavailable"
                ? "No disponible"
                : "Compartir mi ubicación"}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Calculando distancia…</p>
    );
  }

  if (isError || !data?.ok || data.distanceMeters == null) {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos calcular la ruta ahora.
      </p>
    );
  }

  return (
    <p className="text-sm text-foreground">
      <MapPin className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden />
      <span className="font-medium">{formatDistance(data.distanceMeters)}</span>
      {data.durationSeconds != null ? (
        <>
          {" · "}
          <span>{formatDuration(data.durationSeconds)} en auto</span>
        </>
      ) : null}
      <span className="text-muted-foreground"> desde tu ubicación</span>
    </p>
  );
}