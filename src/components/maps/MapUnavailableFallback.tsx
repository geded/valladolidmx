/**
 * MapUnavailableFallback — Degradación elegante y accesible cuando el mapa
 * interactivo no puede cargarse (Lote 3F-B1).
 *
 * Reglas:
 *  - `role="status"` para que los lectores de pantalla anuncien el cambio.
 *  - Texto neutral: nunca menciona dominios, claves ni errores del proveedor.
 *  - Lista alternativa de puntos con enlaces seguros a Google Maps
 *    (`target="_blank"` + `rel="noopener noreferrer"`).
 *  - Nunca deja un bloque vacío.
 */
import { MapPin, ExternalLink } from "lucide-react";
import {
  MAP_UNAVAILABLE_MESSAGE,
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
} from "@/lib/maps/google-maps-loader";

export interface MapFallbackPoint {
  lat: number;
  lng: number;
  title?: string | null;
}

export interface MapUnavailableFallbackProps {
  points?: MapFallbackPoint[];
  className?: string;
}

export function MapUnavailableFallback({ points = [], className }: MapUnavailableFallbackProps) {
  const usable = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0),
  );

  return (
    <div
      role="status"
      aria-live="polite"
      data-map-fallback="true"
      className={
        className ??
        "w-full rounded-2xl border border-border bg-muted/60 p-5 text-sm text-muted-foreground"
      }
    >
      <p className="flex items-start gap-2 text-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{MAP_UNAVAILABLE_MESSAGE}</span>
      </p>

      {usable.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {usable.map((point, index) => {
            const label = point.title?.trim() || `Ubicación ${index + 1}`;
            return (
              <li
                key={`${point.lat},${point.lng},${index}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/70 bg-background px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
                <a
                  href={googleMapsPlaceUrl(point)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Ver en Google Maps
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                <a
                  href={googleMapsDirectionsUrl(point)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Cómo llegar
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
