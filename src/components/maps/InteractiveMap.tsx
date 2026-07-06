/**
 * InteractiveMap — Mapa Google Maps JS con un marker.
 *
 * Reglas (google_maps knowledge):
 *  - loading=async + callback global obligatorio para evitar bloqueo.
 *  - No AdvancedMarker (requiere mapId no configurado).
 *  - No mapId en la construcción del Map.
 *  - Sólo se monta cuando el usuario lo pide (toggle) para no pagar
 *    Maps JS en cada visita.
 *
 * Requiere la browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`)
 * autorizada para el dominio actual. En `*.lovable.app` la managed key
 * funciona; en custom domain requiere la key propia con referrers.
 */
import { useEffect, useRef, useState } from "react";

// Tipos mínimos locales para evitar depender de @types/google.maps.
type LatLng = { lat: number; lng: number };
interface GMap {
  new (el: HTMLElement, opts: Record<string, unknown>): unknown;
}
interface GMarker {
  new (opts: { position: LatLng; map: unknown; title?: string }): unknown;
}
interface GoogleMapsNamespace {
  maps: { Map: GMap; Marker: GMarker };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __vmxGmapsCbList?: Array<() => void>;
    vmxInitGoogleMaps?: () => void;
  }
}

const SCRIPT_ID = "vmx-google-maps-js";

function loadGoogleMapsScript(apiKey: string): Promise<GoogleMapsNamespace> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }

    // Registrar callback antes de crear el script.
    window.__vmxGmapsCbList = window.__vmxGmapsCbList ?? [];
    window.__vmxGmapsCbList.push(() => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Maps JS failed to load"));
    });
    window.vmxInitGoogleMaps = () => {
      const list = window.__vmxGmapsCbList ?? [];
      window.__vmxGmapsCbList = [];
      list.forEach((cb) => cb());
    };

    if (document.getElementById(SCRIPT_ID)) return; // ya en carga
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=vmxInitGoogleMaps`;
    s.onerror = () => reject(new Error("Google Maps script failed"));
    document.head.appendChild(s);
  });
}

export interface InteractiveMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  markerTitle?: string;
  className?: string;
  /** Pines adicionales para renderizar (visitas territoriales). */
  markers?: Array<{ lat: number; lng: number; title?: string; href?: string | null }>;
}

export function InteractiveMap({
  lat,
  lng,
  zoom = 15,
  markerTitle,
  className,
  markers,
}: InteractiveMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    if (!apiKey) {
      setError("Google Maps browser key no configurada.");
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then((google) => {
        if (cancelled || !ref.current) return;
        const map = new google.maps.Map(ref.current, {
          center: { lat, lng },
          zoom,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        const list = markers && markers.length > 0
          ? markers
          : [{ lat, lng, title: markerTitle }];
        for (const m of list) {
          new google.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map,
            title: m.title ?? markerTitle,
          });
        }
        setReady(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo cargar el mapa");
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, zoom, markerTitle, markers]);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-muted p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className ?? "h-[400px] w-full rounded-2xl border border-border bg-muted"}
      aria-label={markerTitle ? `Mapa de ${markerTitle}` : "Mapa interactivo"}
      role="img"
      data-ready={ready ? "true" : "false"}
    />
  );
}