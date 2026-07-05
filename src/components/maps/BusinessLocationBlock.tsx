/**
 * BusinessLocationBlock — Sección "Ubicación" para la ficha de Empresa.
 *
 * Compone StaticMap (server-first, garantizado en cualquier dominio) +
 * dirección + DistanceBadge + botón "Cómo llegar" (deep link a Google
 * Maps del dispositivo) + toggle opcional para mapa interactivo.
 *
 * Reutilizable: acepta lat/lng + address; no depende de MarketplaceBusinessDetail.
 */
import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { StaticMap } from "./StaticMap";
import { DistanceBadge } from "./DistanceBadge";

const InteractiveMap = lazy(() =>
  import("./InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
);

export interface BusinessLocationBlockProps {
  lat: number;
  lng: number;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  heading?: string;
}

export function BusinessLocationBlock({
  lat,
  lng,
  name,
  addressLine1,
  addressLine2,
  heading = "Ubicación",
}: BusinessLocationBlockProps) {
  const [showInteractive, setShowInteractive] = useState(false);

  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
          {addressLine1 ? (
            <p className="mt-2 text-sm text-foreground">
              <MapPin className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden />
              {addressLine1}
              {addressLine2 ? `, ${addressLine2}` : ""}
            </p>
          ) : null}
        </div>

        {showInteractive ? (
          <Suspense
            fallback={
              <div className="h-[400px] w-full animate-pulse rounded-2xl bg-muted" />
            }
          >
            <InteractiveMap
              lat={lat}
              lng={lng}
              markerTitle={name}
              className="h-[400px] w-full rounded-2xl border border-border"
            />
          </Suspense>
        ) : (
          <StaticMap
            lat={lat}
            lng={lng}
            zoom={15}
            width={640}
            height={360}
            alt={`Mapa de ${name}`}
          />
        )}
      </div>

      <aside className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <DistanceBadge destLat={lat} destLng={lng} />

        <Button asChild className="w-full">
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Cómo llegar a ${name}`}
          >
            <Navigation className="mr-2 h-4 w-4" aria-hidden />
            Cómo llegar
          </a>
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowInteractive((s) => !s)}
        >
          <MapIcon className="mr-2 h-4 w-4" aria-hidden />
          {showInteractive ? "Ver mapa estático" : "Ver mapa interactivo"}
        </Button>
      </aside>
    </div>
  );
}