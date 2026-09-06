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
import { useEffect, useRef, useState } from "react";
import {
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
}

export function LocationPickerMap({
  lat,
  lng,
  zoom = 15,
  onChange,
  className,
}: LocationPickerMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ setCenter: (p: LatLng) => void } | null>(null);
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
    loadGoogleMaps(apiKey)
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
        marker.addListener("dragend", ((e: {
          latLng: { lat: () => number; lng: () => number };
        }) => {
          onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }) as never);
        map.addListener("click", ((e: { latLng: { lat: () => number; lng: () => number } }) => {
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(p);
          onChangeRef.current(p);
        }) as never);
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Sync externo: si el padre cambia lat/lng (geolocalización, geocoding),
  // reposicionamos marker + centro.
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setPosition({ lat, lng });
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
