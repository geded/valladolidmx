/**
 * LocationPickerMap — Google Maps con marker DRAGGABLE + click-to-set.
 *
 * Reglas oficiales (google_maps knowledge):
 *  - loading=async + callback global (vía el cargador único compartido).
 *  - Sin AdvancedMarker (no mapId).
 *  - Sólo se monta cuando el panel está visible y con tamaño real.
 *  - Usa exclusivamente `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
 *
 * Emite `onChange({lat,lng})` en drag-end y en click sobre el mapa.
 */
import { getBrandMapStyles } from "@/components/maps/InteractiveMap";
import { useEffect, useRef, useState } from "react";
import {
  acquireGoogleMap,
  getGoogleMapsBrowserKey,
  loadGoogleMaps,
  subscribeGoogleMapsAuthFailure,
} from "@/lib/maps/google-maps-loader";
import { MapUnavailableFallback } from "./MapUnavailableFallback";

type LatLng = { lat: number; lng: number };

export interface LocationPickerMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  onChange: (p: LatLng) => void;
  className?: string;
  /** "cooperative" deja desplazar la página con un dedo (mapa con dos dedos). */
  gestureHandling?: "greedy" | "cooperative";
  /** Usa la paleta de mapas de Valladolid.mx en lugar del verde de Google. */
  brandStyle?: boolean;
  /** Segundo punto fijo (p. ej. destino) unido con una línea de trayecto. */
  companion?: LatLng | null;
}

export function LocationPickerMap({
  lat,
  lng,
  zoom = 15,
  onChange,
  className,
  gestureHandling = "greedy",
  brandStyle = false,
  companion = null,
}: LocationPickerMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ setCenter: (p: LatLng) => void } | null>(null);
  const lineRef = useRef<((p: LatLng) => void) | null>(null);
  const markerRef = useRef<{ setPosition: (p: LatLng) => void } | null>(null);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /* Fallo de autorización del proveedor: suscripción por instancia. */
  useEffect(() => subscribeGoogleMapsAuthFailure(() => setFailed(true)), []);

  /* Montaje condicional: nunca descargar el SDK en contenedores ocultos. */
  useEffect(() => {
    const el = ref.current;
    if (!el || mounted) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setMounted(true);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) check();
      },
      { rootMargin: "128px" },
    );
    io.observe(el);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => check());
      ro.observe(el);
    }
    check();
    return () => {
      io.disconnect();
      ro?.disconnect();
    };
  }, [mounted]);

  // Inicialización única. Cambios posteriores de lat/lng actualizan
  // marker + centro sin recrear el mapa.
  useEffect(() => {
    if (!mounted) return;
    const apiKey = getGoogleMapsBrowserKey();
    if (!apiKey) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    let release: (() => void) | null = null;
    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !ref.current) return;
        const lease = acquireGoogleMap(
          google,
          ref.current,
          {
            center: { lat, lng },
            zoom,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            gestureHandling,
            clickableIcons: false,
            styles: brandStyle ? getBrandMapStyles() : null,
          },
          "picker",
        );
        release = lease.release;
        const map = lease.map;
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
          ...(brandStyle ? { icon: brandDot(google, "--primary", "#eaa840", 11) } : {}),
          title: "Arrastra o toca el mapa para ubicar",
        });
        marker.addListener("dragend", ((e: {
          latLng: { lat: () => number; lng: () => number };
        }) => {
          onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }) as never);
        map.addListener("click", ((e: { latLng: { lat: () => number; lng: () => number } }) => {
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(p);
          lineRef.current?.(p);
          onChangeRef.current(p);
        }) as never);
        let fixed: { setMap: (m: unknown) => void } | null = null;
        let line: { setMap: (m: unknown) => void; setPath: (p: LatLng[]) => void } | null = null;
        if (companion) {
          fixed = new google.maps.Marker({
            position: companion,
            map,
            icon: brandDot(google, "--accent", "#057c94", 8),
          });
          line = new (google.maps as unknown as { Polyline: new (o: unknown) => NonNullable<typeof line> }).Polyline({
            path: [{ lat, lng }, companion],
            map,
            strokeOpacity: 0,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeWeight: 4, strokeColor: cssColor("--primary", "#eaa840") },
                offset: "0",
                repeat: "14px",
              },
            ],
          });
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat, lng });
          bounds.extend(companion);
          map.fitBounds(bounds, 56);
          lineRef.current = (p: LatLng) => line?.setPath([p, companion]);
        }
        mapRef.current = map;
        markerRef.current = marker;
        release = () => {
          google.maps.event?.clearInstanceListeners(marker);
          marker.setMap(null);
          marker.unbindAll();
          fixed?.setMap(null);
          line?.setMap(null);
          lineRef.current = null;
          mapRef.current = null;
          markerRef.current = null;
          lease.release();
        };
      })
      .catch(() => {
        if (!cancelled) {
          release?.();
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
      release?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Sync externo: si el padre cambia lat/lng (geolocalización, geocoding),
  // reposicionamos marker + centro.
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat, lng });
      lineRef.current?.({ lat, lng });
      mapRef.current.setCenter({ lat, lng });
    }
  }, [lat, lng]);

  if (failed) {
    return <MapUnavailableFallback points={[{ lat, lng, title: "Ubicación seleccionada" }]} />;
  }

  return (
    <div
      ref={ref}
      className={className ?? "h-[360px] w-full rounded-2xl border border-border bg-muted"}
      role="application"
      aria-label="Selector de ubicación en el mapa"
      data-map-mounted={mounted ? "true" : "false"}
    />
  );
}

function cssColor(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  const probe = document.createElement("span");
  probe.style.color = v;
  return probe.style.color ? v : fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function brandDot(google: any, token: string, fallback: string, scale: number) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: cssColor(token, fallback),
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}
