/**
 * StaticMap — Mapa estático server-rendered vía proxy interno.
 *
 * Cero JS, SSR-safe, funciona idéntico en preview y custom domain.
 * La imagen se cachea 24h en CDN.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  /** Pines adicionales (kind + coordenadas). Opcional. */
  markers?: Array<{ lat: number; lng: number; kind?: string }>;
}

export function StaticMap({
  lat,
  lng,
  zoom = 15,
  width = 600,
  height = 300,
  alt = "Ubicación en el mapa",
  className,
  markers,
}: StaticMapProps) {
  const [failed, setFailed] = useState(false);
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
    width: String(width),
    height: String(height),
  });
  for (const m of markers ?? []) {
    params.append("m", `${m.kind ?? "poi"}:${m.lat},${m.lng}`);
  }
  const src = `/api/public/maps/static?${params.toString()}`;

  if (failed) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground",
          className,
        )}
        style={{ minHeight: height / 2 }}
      >
        Mapa no disponible por ahora. Prueba <strong className="mx-1 font-medium text-foreground">Ver mapa interactivo</strong>.
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        "w-full h-auto rounded-2xl border border-border bg-muted object-cover",
        className,
      )}
    />
  );
}