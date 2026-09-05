/**
 * Cargador único del SDK de Google Maps JS (Lote 3F-B1).
 *
 * Problemas que resuelve:
 *  - `gm_authFailure` era asignado por cada instancia de mapa, de modo que la
 *    última en montar pisaba a las anteriores y sólo un componente reaccionaba
 *    al fallo de autorización. Aquí se registra UNA sola vez y se difunde a
 *    todas las suscripciones activas.
 *  - `InteractiveMap` y `LocationPickerMap` duplicaban el cargador del script
 *    (mismo SCRIPT_ID, callbacks paralelos). Ahora comparten esta única
 *    implementación con una promesa memoizada.
 *
 * Reglas oficiales (google_maps knowledge): `loading=async` + callback global,
 * sin `mapId`, sin AdvancedMarker, clave exclusivamente desde
 * `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
 *
 * Este módulo NO modifica claves, allowlists, APIs ni cuotas.
 */

type LatLng = { lat: number; lng: number };

export interface GMapInstance {
  fitBounds: (bounds: unknown, padding?: number) => void;
  setZoom: (zoom: number) => void;
  setCenter: (position: LatLng) => void;
  addListener: (event: string, handler: (e: never) => void) => void;
}
export interface GMap {
  new (el: HTMLElement, opts: Record<string, unknown>): GMapInstance;
}
export interface GMarkerInstance {
  addListener: (event: string, handler: (e: never) => void) => void;
  setPosition: (position: LatLng) => void;
}
export interface GMarker {
  new (opts: {
    position: LatLng;
    map: unknown;
    title?: string;
    label?: unknown;
    icon?: unknown;
    zIndex?: number;
    draggable?: boolean;
  }): GMarkerInstance;
}
export interface GSize {
  new (width: number, height: number): unknown;
}
export interface GPoint {
  new (x: number, y: number): unknown;
}
export interface GLatLngBounds {
  new (): { extend: (position: LatLng) => void };
}
export interface GPolyline {
  new (opts: Record<string, unknown>): { setMap: (map: unknown) => void };
}
export interface GDirectionsService {
  new (): {
    route: (
      request: Record<string, unknown>,
      callback: (result: unknown, status: string) => void,
    ) => void;
  };
}
export interface GDirectionsRenderer {
  new (opts: Record<string, unknown>): { setDirections: (result: unknown) => void };
}
export interface GoogleMapsNamespace {
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

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __vmxGmapsCbList?: Array<() => void>;
    vmxInitGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

export const GOOGLE_MAPS_SCRIPT_ID = "vmx-google-maps-js";

/** Mensaje neutral y único para cualquier fallo del proveedor de mapas. */
export const MAP_UNAVAILABLE_MESSAGE =
  "El mapa interactivo no está disponible en este momento. Puedes consultar las ubicaciones en la lista.";

type Listener = () => void;

let authListeners = new Set<Listener>();
let authFailed = false;
let authHookInstalled = false;
let loaderPromise: Promise<GoogleMapsNamespace> | null = null;

function getWindow(): (Window & typeof globalThis) | null {
  return typeof window === "undefined" ? null : window;
}

function installAuthHook() {
  const w = getWindow();
  if (!w || authHookInstalled) return;
  authHookInstalled = true;
  w.gm_authFailure = () => {
    authFailed = true;
    // Copia defensiva: un listener puede desuscribirse durante la difusión.
    [...authListeners].forEach((listener) => listener());
  };
}

/**
 * Suscribe una instancia de mapa al fallo de autorización del proveedor.
 * Devuelve la función de limpieza; múltiples instancias conviven sin pisarse.
 */
export function subscribeGoogleMapsAuthFailure(listener: Listener): () => void {
  installAuthHook();
  authListeners.add(listener);
  if (authFailed) listener();
  return () => {
    authListeners.delete(listener);
  };
}

/** `true` cuando el proveedor ya rechazó la autorización en esta sesión. */
export function hasGoogleMapsAuthFailed(): boolean {
  return authFailed;
}

/** Número de suscripciones activas (uso interno y pruebas de limpieza). */
export function googleMapsAuthListenerCount(): number {
  return authListeners.size;
}

/** Clave de navegador; nunca se registra ni se expone su valor. */
export function getGoogleMapsBrowserKey(): string | undefined {
  return import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
}

/**
 * Carga el SDK una sola vez por documento. Las llamadas concurrentes o
 * posteriores reutilizan la misma promesa (sin segundo <script>).
 */
export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNamespace> {
  const w = getWindow();
  if (!w) return Promise.reject(new Error("SSR"));
  if (w.google?.maps) return Promise.resolve(w.google);
  if (loaderPromise) return loaderPromise;

  installAuthHook();

  loaderPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    w.__vmxGmapsCbList = w.__vmxGmapsCbList ?? [];
    w.__vmxGmapsCbList.push(() => {
      if (w.google?.maps) resolve(w.google);
      else reject(new Error("Maps JS failed to load"));
    });
    w.vmxInitGoogleMaps = () => {
      const list = w.__vmxGmapsCbList ?? [];
      w.__vmxGmapsCbList = [];
      list.forEach((cb) => cb());
    };

    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) return; // ya en carga
    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=vmxInitGoogleMaps`;
    script.onerror = () => reject(new Error("Google Maps script failed"));
    document.head.appendChild(script);
  });

  loaderPromise.catch(() => {
    // Permite reintentar en una navegación posterior sin dejar la promesa rota.
    loaderPromise = null;
  });

  return loaderPromise;
}

/** Enlace seguro a la ficha del punto en Google Maps (nueva pestaña). */
export function googleMapsPlaceUrl(point: {
  lat: number;
  lng: number;
  title?: string | null;
}): string {
  const query = `${point.lat},${point.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Enlace seguro de "cómo llegar" en Google Maps (nueva pestaña). */
export function googleMapsDirectionsUrl(point: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${point.lat},${point.lng}`,
  )}`;
}

/** Sólo para pruebas: restablece el estado del módulo. */
export function __resetGoogleMapsLoaderForTests() {
  authListeners = new Set();
  authFailed = false;
  authHookInstalled = false;
  loaderPromise = null;
  const w = getWindow();
  if (w) {
    delete w.gm_authFailure;
    delete w.__vmxGmapsCbList;
    delete w.vmxInitGoogleMaps;
  }
}
