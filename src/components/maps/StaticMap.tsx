/**
 * StaticMap — Mapa estático server-rendered vía proxy interno.
 *
 * Cero JS, SSR-safe, funciona idéntico en preview y custom domain.
 * La imagen se cachea 24h en CDN.
 */
import { cn } from "@/lib/utils";

export interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}

export function StaticMap({
  lat,
  lng,
  zoom = 15,
  width = 600,
  height = 300,
  alt = "Ubicación en el mapa",
  className,
}: StaticMapProps) {
  const src = `/api/public/maps/static?lat=${lat}&lng=${lng}&zoom=${zoom}&width=${width}&height=${height}`;
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={cn(
        "w-full h-auto rounded-2xl border border-border bg-muted object-cover",
        className,
      )}
    />
  );
}