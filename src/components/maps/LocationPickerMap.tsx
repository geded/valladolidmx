/**
 * LocationPickerMap — Google Maps con marker DRAGGABLE + click-to-set.
 *
 * Reglas oficiales (google_maps knowledge):
 *  - loading=async + callback global.
 *  - Sin AdvancedMarker (no mapId).
 *  - Sólo se monta cuando el editor está en pantalla.
 *  - Usa exclusivamente `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
 *
 * Emite `onChange({lat,lng})` en drag-end y en click sobre el mapa.
 */
import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };
interface GMap {
  new (el: HTMLElement, opts: Record<string, unknown>): {
    setCenter: (p: LatLng) => void;
    addListener: (ev: string, cb: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void;
  };
}
interface GMarker {
  new (opts: {
    position: LatLng;
    map: unknown;
    draggable?: boolean;
    title?: string;
  }): {
    setPosition: (p: LatLng) => void;
    addListener: (ev: string, cb: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void;
  };
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
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.google?.maps) return resolve(window.google);
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
    if (document.getElementById(SCRIPT_ID)) return;
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

export interface LocationPickerMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  onChange: (p: LatLng) => void;
  className?: string;
}

export function LocationPickerMap({
  lat,
  lng,
  zoom = 15,
  onChange,
  className,
}: LocationPickerMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<ReturnType<InstanceType<GMap>["addListener"]> extends never ? never : InstanceType<GMap> | null>(null);
  const markerRef = useRef<InstanceType<GMarker> | null>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inicialización única. Cambios posteriores de lat/lng actualizan
  // marker + centro sin recrear el mapa.
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
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
        });
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
          title: "Arrastra o toca el mapa para ubicar",
        });
        marker.addListener("dragend", (e) => {
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          onChangeRef.current(p);
        });
        map.addListener("click", (e) => {
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(p);
          onChangeRef.current(p);
        });
        mapRef.current = map as unknown as InstanceType<GMap>;
        markerRef.current = marker;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Mapa no disponible"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync externo: si el padre cambia lat/lng (geolocalización, geocoding),
  // reposicionamos marker + centro.
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat, lng });
      mapRef.current.setCenter({ lat, lng });
    }
  }, [lat, lng]);

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
      className={className ?? "h-[360px] w-full rounded-2xl border border-border bg-muted"}
      role="application"
      aria-label="Selector de ubicación en el mapa"
    />
  );
}