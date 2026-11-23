/**
 * Agrupación de pines para mapas con muchos lugares (Valladolid arranca con
 * ~200 empresas más sitios de interés).
 *
 * Reglas:
 *  - De lejos, los pines que caen en la misma celda de pantalla se juntan en
 *    una burbuja con número; al acercarse se separan.
 *  - Un pin destacado (pin dorado de los paquetes) nunca queda dentro de
 *    una burbuja: siempre se dibuja solo.
 *  - Con pocos pines o con mucho acercamiento no se agrupa nada.
 *
 * Función pura (sin Google Maps): proyección Web Mercator en píxeles.
 */
export interface ClusterInput {
  lat: number;
  lng: number;
  featured?: boolean;
}

export interface MarkerCluster {
  /** Índices de los pines originales dentro de la burbuja (≥ 2). */
  members: number[];
  lat: number;
  lng: number;
  bounds: { north: number; south: number; east: number; west: number };
}

export interface ClusterResult {
  /** Índices que se dibujan como pin individual. */
  singles: number[];
  clusters: MarkerCluster[];
}

/** Por debajo de este número de pines no se agrupa. */
export const CLUSTER_MIN_MARKERS = 12;
/** A partir de este acercamiento todo se ve suelto (nivel de calle). */
export const CLUSTER_MAX_ZOOM = 17;
/** Lado de la celda de agrupación en píxeles de pantalla. */
export const CLUSTER_CELL_PX = 56;

function worldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function clusterMarkers(
  points: readonly ClusterInput[],
  zoom: number,
  options: { cellPx?: number; minMarkers?: number; maxZoom?: number } = {},
): ClusterResult {
  const cell = options.cellPx ?? CLUSTER_CELL_PX;
  const min = options.minMarkers ?? CLUSTER_MIN_MARKERS;
  const maxZoom = options.maxZoom ?? CLUSTER_MAX_ZOOM;
  const all = points.map((_, i) => i);
  if (points.length < min || zoom >= maxZoom) return { singles: all, clusters: [] };

  const cells = new Map<string, number[]>();
  const singles: number[] = [];
  points.forEach((p, i) => {
    if (p.featured) {
      singles.push(i);
      return;
    }
    const { x, y } = worldPixel(p.lat, p.lng, zoom);
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  });

  const clusters: MarkerCluster[] = [];
  for (const members of cells.values()) {
    if (members.length === 1) {
      singles.push(members[0]!);
      continue;
    }
    let lat = 0;
    let lng = 0;
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
    for (const i of members) {
      const p = points[i]!;
      lat += p.lat;
      lng += p.lng;
      north = Math.max(north, p.lat);
      south = Math.min(south, p.lat);
      east = Math.max(east, p.lng);
      west = Math.min(west, p.lng);
    }
    clusters.push({
      members,
      lat: lat / members.length,
      lng: lng / members.length,
      bounds: { north, south, east, west },
    });
  }
  singles.sort((a, b) => a - b);
  return { singles, clusters };
}

/** Familia visible de un pin en el mapa (ícono y filtro). */
export type MapPinCategory = "hotel" | "restaurante" | "casa" | "experiencia" | "lugar" | "otro";

export const MAP_PIN_CATEGORY_LABELS: Record<MapPinCategory, string> = {
  hotel: "Hoteles",
  restaurante: "Restaurantes",
  casa: "Casas de vacaciones",
  experiencia: "Experiencias",
  lugar: "Lugares de interés",
  otro: "Otros",
};

/** Orden fijo de los filtros encima del mapa. */
export const MAP_PIN_CATEGORY_ORDER: readonly MapPinCategory[] = [
  "hotel",
  "restaurante",
  "casa",
  "experiencia",
  "lugar",
  "otro",
];

/** ¿El punto cae dentro del área visible del mapa? */
export function pointInBounds(
  p: { lat: number; lng: number },
  b: { north: number; south: number; east: number; west: number },
): boolean {
  if (p.lat > b.north || p.lat < b.south) return false;
  return b.west <= b.east ? p.lng >= b.west && p.lng <= b.east : p.lng >= b.west || p.lng <= b.east;
}
