/**
 * A13 · Banner proactivo de sugerencias cercanas.
 *
 * Aparece en la página de un destino cuando el visitante ya compartió
 * su ubicación (opt-in previo). Calcula cuántos lugares publicados del
 * destino están dentro de un radio útil y ofrece abrir el concierge
 * flotante con contexto ya cargado — sin sacar al visitante de la
 * superficie ni pedir permisos de nuevo.
 *
 * Es lectura pura: no consulta la BD (los items ya vienen del loader
 * del destino) y sólo se muestra cuando aporta información real.
 */
import { useMemo } from "react";
import { Sparkles, MapPin } from "lucide-react";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { logAluxPublicSignal } from "@/lib/alux/public-signals";

export interface NearbyPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface AluxNearbySuggestionBannerProps {
  destinationLabel: string;
  points: NearbyPoint[];
  /** Radio máximo en km para considerar "cercano". Default 5 km. */
  radiusKm?: number;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function AluxNearbySuggestionBanner({
  destinationLabel,
  points,
  radiusKm = 5,
}: AluxNearbySuggestionBannerProps) {
  const { location, status } = useVisitorGeolocation();

  const nearby = useMemo(() => {
    if (!location) return [];
    return points
      .map((p) => ({ id: p.id, km: haversineKm(location, { lat: p.lat, lng: p.lng }) }))
      .filter((p) => p.km <= radiusKm)
      .sort((a, b) => a.km - b.km);
  }, [location, points, radiusKm]);

  // Sólo si el visitante ya dio permiso y hay al menos 3 lugares cerca.
  if (status !== "granted" || nearby.length < 3) return null;

  const count = nearby.length;
  const maxKm = nearby[Math.min(count - 1, 4)].km;
  const distanceLabel =
    maxKm < 1 ? `${Math.round(maxKm * 1000)} m` : `${maxKm.toFixed(1)} km`;

  return (
    <div
      role="note"
      aria-label="Sugerencia proactiva de Alux"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            Alux te sugiere {count} lugares a menos de {distanceLabel} de ti
          </p>
          <p className="text-xs text-muted-foreground">
            Ordenados por cercanía real en {destinationLabel}. Puedo priorizar
            por tus intereses o filtrar por lo que está abierto ahora.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          logAluxPublicSignal({
            action: "open_nearby_suggestion",
            label: destinationLabel,
          });
          openAluxFloating({ reason: "nearby-suggestion", hint: destinationLabel });
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
      >
        <MapPin className="size-3.5" aria-hidden />
        Ver con Alux
      </button>
    </div>
  );
}