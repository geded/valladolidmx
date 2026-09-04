/**
 * Lote 3C · Contrato público único de Rutas / Itinerarios editoriales.
 *
 * Autoridad CMS-first: todo lo que la superficie muestra proviene de
 * `editorial_routes` y `editorial_route_stops`. Cero fixtures, cero
 * inferencias: los campos que el editor no capturó llegan vacíos y la
 * superficie los omite.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";

export const ROUTE_PUBLIC_CONTRACT_VERSION = "1.0.0";

export type EditorialRoutePalette = "territorio" | "selva" | "cenote" | "atardecer";

export type EditorialRouteStopKind =
  | "place"
  | "experience"
  | "event"
  | "business"
  | "product"
  | "destination"
  | "note";

export interface EditorialRouteStopDTO {
  id: string;
  position: number;
  dayNumber: number | null;
  entityKind: EditorialRouteStopKind;
  entityId: string | null;
  title: string;
  note: string | null;
  durationMinutes: number | null;
  /** Enlace canónico resuelto; `null` cuando la entidad no es navegable. */
  href: string | null;
}

export interface EditorialRouteCardDTO {
  id: string;
  slug: string;
  name: string;
  summary: string;
  palette: EditorialRoutePalette;
  regionSlug: string;
  durationDays: number | null;
  durationHours: number | null;
  pace: string | null;
  difficulty: string | null;
  interests: string[];
  audiences: string[];
  seasons: string[];
  destinationSlugs: string[];
  originDestinationSlug: string | null;
  originDestinationLabel: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  stopCount: number;
}

export interface EditorialRouteDetailDTO extends EditorialRouteCardDTO {
  contractVersion: string;
  stops: EditorialRouteStopDTO[];
  gallery: Array<{ url: string; alt: string | null }>;
}

export function routePublicPath(slug: string): string {
  return `/rutas/${slug}`;
}

const PACE_LABELS: Record<string, string> = {
  relajado: "Ritmo relajado",
  moderado: "Ritmo moderado",
  intenso: "Ritmo intenso",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  baja: "Dificultad baja",
  media: "Dificultad media",
  alta: "Dificultad alta",
};

export function routePaceLabel(pace: string | null): string | null {
  if (!pace) return null;
  return PACE_LABELS[pace] ?? pace;
}

export function routeDifficultyLabel(difficulty: string | null): string | null {
  if (!difficulty) return null;
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

export function routeDurationLabel(route: {
  durationDays: number | null;
  durationHours: number | null;
}): string | null {
  if (route.durationDays && route.durationDays > 0)
    return route.durationDays === 1 ? "1 día" : `${route.durationDays} días`;
  if (route.durationHours && route.durationHours > 0) return `${route.durationHours} h`;
  return null;
}

/** Proyección al VM oficial de tarjeta turística (Founder Discovery Standard). */
export function routeToTourismCard(
  route: EditorialRouteCardDTO,
  destinationLabelOf?: (slug: string) => string,
): TourismCardVM {
  const labelOf = destinationLabelOf ?? ((s: string) => s.replace(/-/g, " "));
  const duration = routeDurationLabel(route);
  const highlights = [
    duration,
    route.stopCount > 0 ? `${route.stopCount} paradas` : null,
    routePaceLabel(route.pace),
  ].filter((v): v is string => Boolean(v));

  return {
    id: route.id,
    entityKind: null,
    eyebrow: "Ruta sugerida",
    name: route.name,
    href: routePublicPath(route.slug),
    tagline: route.summary || null,
    businessName: null,
    mediaUrl: route.coverUrl,
    mediaAlt: route.coverAlt,
    rating: null,
    location: null,
    territorialContext:
      route.originDestinationLabel ??
      (route.destinationSlugs.length ? labelOf(route.destinationSlugs[0]) : null),
    highlights,
    badges: routeDifficultyLabel(route.difficulty)
      ? [{ label: routeDifficultyLabel(route.difficulty)!, tone: "info" as const }]
      : [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: { label: "Ver ruta", href: routePublicPath(route.slug) },
    secondaryAction: null,
  };
}
