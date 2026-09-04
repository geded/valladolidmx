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

// Tipos mínimos locales para evitar depender de @types/google.maps.
type LatLng = { lat: number; lng: number };
interface GMap {
  new (
    el: HTMLElement,
    opts: Record<string, unknown>,
  ): {
    fitBounds: (bounds: unknown, padding?: number) => void;
    setZoom: (zoom: number) => void;
  };
}
interface GMarker {
  new (opts: {
    position: LatLng;
    map: unknown;
    title?: string;
    label?: unknown;
    icon?: unknown;
    zIndex?: number;
  }): { addListener: (event: string, handler: () => void) => void };
}
interface GSize {
  new (width: number, height: number): unknown;
}
interface GPoint {
  new (x: number, y: number): unknown;
}
interface GLatLngBounds {
  new (): { extend: (position: LatLng) => void };
}
interface GPolyline {
  new (opts: Record<string, unknown>): { setMap: (map: unknown) => void };
}
interface GDirectionsService {
  new (): {
    route: (
      request: Record<string, unknown>,
      callback: (result: unknown, status: string) => void,
    ) => void;
  };
}
interface GDirectionsRenderer {
  new (opts: Record<string, unknown>): { setDirections: (result: unknown) => void };
}
interface GoogleMapsNamespace {
  maps: {
    Map: GMap;
    Marker: GMarker;
    Size: GSize;
    Point: GPoint;
    LatLngBounds: GLatLngBounds;
    Polyline: GPolyline;
    DirectionsService: GDirectionsService;
    DirectionsRenderer: GDirectionsRenderer;
    TravelMode: { DRIVING: string };
    DirectionsStatus: { OK: string };
  };
}

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

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __vmxGmapsCbList?: Array<() => void>;
    vmxInitGoogleMaps?: () => void;
  }
}

const SCRIPT_ID = "vmx-google-maps-js";

/**
 * Cartografía territorial Valladolid.mx.
 * Conserva calles y referencias geográficas útiles, reduce ruido comercial
 * y traslada la paleta crema / selva / oro al lienzo de Google Maps.
 */
const VALLADOLID_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#eee8d8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#23483a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7f3e9" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#b7aa86" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#123e2f" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#dfe5cf" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#f3eddf" }],
  },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#d7dfc8" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#c7d6b6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#fffaf0" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d5c9aa" }],
  },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d7a641" }] },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#b47b13" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#173f31" }],
  },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#8cbfc0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#285e60" }] },
] as const;

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
  if (typeof document === "undefined") {
    return { bg: "#c88a17", fg: "#fffaf0", stroke: "#123e2f" };
  }
  const root = getComputedStyle(document.documentElement);
  const bg = root.getPropertyValue("--primary").trim() || "#EAA840";
  const fg = root.getPropertyValue("--primary-foreground").trim() || "#fffaf0";
  return { bg, fg, stroke: "#123e2f" };
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
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const routeStatusRef = useRef(onRouteStatus);
  const markerSelectRef = useRef(onMarkerSelect);
  routeStatusRef.current = onRouteStatus;
  markerSelectRef.current = onMarkerSelect;

  useEffect(() => {
    const apiKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    if (!apiKey) {
      setError("Google Maps browser key no configurada.");
      return;
    }
    /* Dominio no autorizado por la clave: mensaje propio, sin tarjeta de Google. */
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      setError("El mapa no está disponible en este dominio de revisión.");
    };
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then((google) => {
        if (cancelled || !ref.current) return;
        const map = new google.maps.Map(ref.current, {
          center: { lat, lng },
          zoom,
          styles: VALLADOLID_MAP_STYLES,
          backgroundColor: "#eee8d8",
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
        const stops = routeStops ?? (connectByRoad ? list.map((m) => ({ lat: m.lat, lng: m.lng })) : []);
        if (stops.length > 1) {
          const directions = new google.maps.DirectionsService();
          const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: "#c88a17",
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
                strokeColor: "#c88a17",
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
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo cargar el mapa");
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, zoom, markerTitle, markers, connectByRoad, routeStops, optimizeRoute]);


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
