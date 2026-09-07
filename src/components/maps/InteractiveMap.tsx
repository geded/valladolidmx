/**
 * InteractiveMap — Mapa Google Maps JS con markers personalizados.
 *
 * Reglas (google_maps knowledge):
 *  - loading=async + callback global obligatorio para evitar bloqueo.
 *  - No AdvancedMarker (requiere mapId no configurado).
 *  - No mapId en la construcción del Map.
 *  - Sólo se monta cuando el usuario lo pide (toggle) para no pagar
 *    Maps JS en cada visita.
 *
 * El lienzo usa la cartografía territorial Valladolid.mx y cada marker se
 * renderiza como un pin de marca con la letra asignada (A, B, C…)
 * para que el visitante pueda detectar y correlacionar los servicios del
 * listado con su ubicación en el mapa.
 *
 * Requiere la browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`)
 * autorizada para el dominio actual. En `*.lovable.app` la managed key
 * funciona; en custom domain requiere la key propia con referrers.
 */
import { useEffect, useRef, useState } from "react";
import {
  getGoogleMapsBrowserKey,
  loadGoogleMaps,
  subscribeGoogleMapsAuthFailure,
} from "@/lib/maps/google-maps-loader";
import { MapUnavailableFallback } from "./MapUnavailableFallback";

/** Resultado de la capa de ruta, reportado a la superficie consumidora. */
export interface MapRouteStatus {
  /** `directions` = geometría vial real; `approximate` = línea entre coordenadas CMS. */
  mode: "directions" | "approximate" | "none";
  /** Estado devuelto por el proveedor cuando falla (bloqueo exacto). */
  providerStatus?: string;
  /** Sólo cuando `mode === "directions"`: métricas reales del proveedor. */
  distanceMeters?: number;
  durationSeconds?: number;
  /** Orden optimizado devuelto por el proveedor (índices de waypoints). */
  waypointOrder?: number[];
}

/**
 * Cartografía territorial Valladolid.mx.
 * Conserva calles y referencias geográficas útiles, reduce ruido comercial
 * y traslada la paleta crema / selva / oro al lienzo de Google Maps.
 */
function themeColor(property: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim() || fallback;
}

function mixHex(a: string, b: string, amount: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  return `#${channels(a)
    .map((channel, index) =>
      Math.round(channel + (channels(b)[index]! - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function getBrandMapStyles() {
  const background = themeColor("--background", "#fbf7ee");
  const secondary = themeColor("--secondary", "#ece4d3");
  const territory = themeColor("--selva", "#234933");
  const primary = themeColor("--primary", "#eaa840");
  const accent = themeColor("--accent", "#057c94");
  return [
    { elementType: "geometry", stylers: [{ color: secondary }] },
    { elementType: "labels.text.fill", stylers: [{ color: territory }] },
    { elementType: "labels.text.stroke", stylers: [{ color: background }] },
    {
      featureType: "administrative",
      elementType: "geometry.stroke",
      stylers: [{ color: mixHex(secondary, territory, 0.28) }],
    },
    {
      featureType: "administrative.country",
      elementType: "labels.text.fill",
      stylers: [{ color: territory }],
    },
    {
      featureType: "landscape.natural",
      elementType: "geometry",
      stylers: [{ color: mixHex(secondary, territory, 0.12) }],
    },
    {
      featureType: "landscape.man_made",
      elementType: "geometry",
      stylers: [{ color: mixHex(background, secondary, 0.45) }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: mixHex(secondary, territory, 0.16) }],
    },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: mixHex(secondary, territory, 0.24) }],
    },
    { featureType: "road", elementType: "geometry", stylers: [{ color: background }] },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: mixHex(secondary, territory, 0.2) }],
    },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: primary }] },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: mixHex(primary, territory, 0.25) }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: territory }],
    },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: mixHex(accent, background, 0.55) }],
    },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: accent }] },
  ];
}

/**
 * Montaje condicional: el SDK sólo se descarga cuando el contenedor está
 * realmente visible y con tamaño > 0. Evita pagar Maps JS dentro de paneles
 * ocultos (`hidden`, `display:none`) o de tamaño cero en móvil y tablet.
 */
function useVisibleWithSize(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setVisible(true);
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
  }, [ref, visible]);

  return visible;
}

export interface InteractiveMapMarker {
  lat: number;
  lng: number;
  title?: string;
  href?: string | null;
  /** Identificador estable (slug) para sincronizar tarjeta ↔ marcador. */
  key?: string;
  /** Posición 1..n dentro del recorrido seleccionado. */
  order?: number | null;
}

export interface InteractiveMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  markerTitle?: string;
  className?: string;
  /** Pines adicionales para renderizar (visitas territoriales). */
  markers?: InteractiveMapMarker[];
  /** Conecta los pines, en su orden, siguiendo carreteras reales. */
  connectByRoad?: boolean;
  /** Paradas ordenadas del recorrido; dibuja la ruta si hay 2 o más. */
  routeStops?: Array<{ lat: number; lng: number; key?: string }>;
  /** Pide al proveedor el orden óptimo de paradas intermedias. */
  optimizeRoute?: boolean;
  /** Reporta la capacidad real usada y el bloqueo exacto del proveedor. */
  onRouteStatus?: (status: MapRouteStatus) => void;
  /** Selección de un marcador desde el mapa. */
  onMarkerSelect?: (key: string) => void;
}

function labelForIndex(i: number) {
  return String.fromCharCode(65 + (i % 26));
}

function getMarkerColors(): { bg: string; fg: string; stroke: string } {
  return {
    bg: themeColor("--primary", "#eaa840"),
    fg: themeColor("--primary-foreground", "#1c1d14"),
    stroke: themeColor("--selva", "#234933"),
  };
}

function markerIconDataUri(letter: string, selected = false): string {
  const { bg, fg, stroke } = getMarkerColors();
  const body = selected ? stroke : bg;
  const ring = selected ? bg : stroke;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
    <path d="M20 2C10.6 2 3 9.6 3 19c0 12.4 17 27 17 27s17-14.6 17-27C37 9.6 29.4 2 20 2Z" fill="${body}" stroke="${ring}" stroke-width="2.5"/>
    <circle cx="20" cy="19" r="10" fill="${ring}" opacity=".92"/>
    <text x="20" y="23.5" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="${selected ? stroke : fg}">${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function InteractiveMap({
  lat,
  lng,
  zoom = 15,
  markerTitle,
  className,
  markers,
  connectByRoad = false,
  routeStops,
  optimizeRoute = false,
  onRouteStatus,
  onMarkerSelect,
}: InteractiveMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const routeStatusRef = useRef(onRouteStatus);
  const markerSelectRef = useRef(onMarkerSelect);
  routeStatusRef.current = onRouteStatus;
  markerSelectRef.current = onMarkerSelect;

  /* Sólo se descarga el SDK cuando el panel está visible y con tamaño real. */
  const shouldMount = useVisibleWithSize(ref);

  /* Fallo de autorización del proveedor: suscripción por instancia. */
  useEffect(() => subscribeGoogleMapsAuthFailure(() => setFailed(true)), []);

  useEffect(() => {
    if (!shouldMount) return;
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
          styles: getBrandMapStyles(),
          backgroundColor: themeColor("--secondary", "#ece4d3"),
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        const list: InteractiveMapMarker[] =
          markers && markers.length > 0 ? markers : [{ lat, lng, title: markerTitle }];
        const bounds = new google.maps.LatLngBounds();
        list.forEach((m, i) => {
          const selected = typeof m.order === "number" && m.order > 0;
          const label = selected ? String(m.order) : labelForIndex(i);
          const marker = new google.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map,
            title: `${label} · ${m.title ?? markerTitle ?? "Ubicación"}`,
            zIndex: selected ? 20 : 10,
            icon: {
              url: markerIconDataUri(label, selected),
              scaledSize: new google.maps.Size(40, 48),
              anchor: new google.maps.Point(20, 48),
            },
          });
          if (m.key) {
            marker.addListener("click", () => markerSelectRef.current?.(m.key as string));
          }
          bounds.extend({ lat: m.lat, lng: m.lng });
        });
        if (list.length > 1) map.fitBounds(bounds, 88);

        /* Capa de ruta: sólo con la capacidad real del proveedor. */
        const stops =
          routeStops ?? (connectByRoad ? list.map((m) => ({ lat: m.lat, lng: m.lng })) : []);
        if (stops.length > 1) {
          const directions = new google.maps.DirectionsService();
          const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: themeColor("--primary", "#eaa840"),
              strokeOpacity: 0.95,
              strokeWeight: 5,
            },
          });
          directions.route(
            {
              origin: { lat: stops[0].lat, lng: stops[0].lng },
              destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
              waypoints: stops.slice(1, -1).map((point) => ({
                location: { lat: point.lat, lng: point.lng },
                stopover: true,
              })),
              travelMode: google.maps.TravelMode.DRIVING,
              optimizeWaypoints: optimizeRoute,
            },
            (result, status) => {
              if (cancelled) return;
              if (status === google.maps.DirectionsStatus.OK && result) {
                renderer.setDirections(result);
                const route = (
                  result as {
                    routes?: Array<{
                      waypoint_order?: number[];
                      legs?: Array<{
                        distance?: { value?: number };
                        duration?: { value?: number };
                      }>;
                    }>;
                  }
                ).routes?.[0];
                const legs = route?.legs ?? [];
                routeStatusRef.current?.({
                  mode: "directions",
                  distanceMeters: legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0),
                  durationSeconds: legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0),
                  waypointOrder: route?.waypoint_order,
                });
                return;
              }
              /* Sin Directions: línea aproximada derivada de coordenadas CMS. */
              new google.maps.Polyline({
                map,
                path: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
                strokeColor: themeColor("--primary", "#eaa840"),
                strokeOpacity: 0,
                icons: [
                  {
                    icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, scale: 3 },
                    offset: "0",
                    repeat: "14px",
                  },
                ],
              });
              map.fitBounds(bounds, 88);
              routeStatusRef.current?.({ mode: "approximate", providerStatus: status });
            },
          );
        } else {
          routeStatusRef.current?.({ mode: "none" });
        }
        setReady(true);
      })
      .catch(() => {
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldMount, lat, lng, zoom, markerTitle, markers, connectByRoad, routeStops, optimizeRoute]);

  if (failed) {
    const points = (
      markers && markers.length > 0 ? markers : [{ lat, lng, title: markerTitle }]
    ).map((m) => ({ lat: m.lat, lng: m.lng, title: m.title ?? markerTitle ?? null }));
    return <MapUnavailableFallback points={points} />;
  }

  return (
    <div
      ref={ref}
      className={className ?? "h-[400px] w-full rounded-2xl border border-border bg-muted"}
      aria-label={markerTitle ? `Mapa de ${markerTitle}` : "Mapa interactivo"}
      role="img"
      data-ready={ready ? "true" : "false"}
      data-map-mounted={shouldMount ? "true" : "false"}
    />
  );
}
