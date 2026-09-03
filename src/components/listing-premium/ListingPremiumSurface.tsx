/**
 * G8-E · `ListingPremiumSurface` — envoltura productiva de los 6 listados
 * turísticos Premium G5.
 *
 * G8-R1 · R1-B — vía canónica única (H-R1-01): la variante
 * `ListingPremiumSurfaceFromDTO` recibe el `PublicListingDTO` producido
 * por las lecturas reales y lo renderiza con la MISMA superficie oficial
 * que usan Studio y la preview. Ninguna ruta productiva recibe fixtures.
 *
 * Autoridad de render: `TourismListingSurface` (Founder Discovery
 * Standard). Esta capa sólo traduce el contenido aprobado a las props de
 * la superficie oficial; no introduce layout paralelo ni chrome global.
 */
import { lazy, Suspense, type ReactNode } from "react";
import {
  TourismListingSurface,
  buildDestinationFacet,
  buildEntityKindFacet,
  type FacetDef,
} from "@/components/surfaces/TourismListingSurface";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumDiscoveryListingSurface } from "./PremiumDiscoveryListingSurface";

const InteractiveMap = lazy(() =>
  import("@/components/maps/InteractiveMap").then((module) => ({ default: module.InteractiveMap })),
);

const FAMILY_EXPERIENCE = {
  hoteles: {
    label: "opciones de hospedaje",
    prompts: [
      "Hotel boutique",
      "Viaje en pareja",
      "Cerca del centro",
      "Con piscina",
      "Base para explorar",
    ],
  },
  restaurantes: {
    label: "mesas y experiencias gastronómicas",
    prompts: [
      "Cocina yucateca",
      "Cena en pareja",
      "Viaje familiar",
      "Patio tranquilo",
      "Sabores locales",
    ],
  },
  experiencias: {
    label: "experiencias",
    prompts: ["Naturaleza", "Cultura maya", "Con guía local", "En familia", "Aventura"],
  },
  eventos: {
    label: "eventos",
    prompts: ["Esta semana", "Cultura", "Gastronomía", "En familia", "Entrada libre"],
  },
  "casas-de-vacaciones": {
    label: "casas de vacaciones",
    prompts: ["Viaje familiar", "Estancia larga", "Con piscina", "Cerca del centro", "Con cocina"],
  },
  "que-hacer": {
    label: "lugares y actividades",
    prompts: ["Primera visita", "Un día", "Naturaleza", "Cultura", "Cerca de Valladolid"],
  },
} as const;

export interface ListingPremiumSurfaceProps {
  hero: {
    eyebrow: string | null;
    title: string;
    subtitle: string | null;
    mediaUrl: string | null;
    mediaAlt: string | null;
    metaLabel?: string | null;
  };
  items: TourismCardVM[];
  facets?: FacetDef[];
  columns?: 1 | 2 | 3;
  destinationSlug?: string | null;
  destinationLabel?: string | null;
  emptyMessage?: string;
  showAddToTrip?: boolean;
  showFavorite?: boolean;
  presentation?: PremiumPresentation;
  familyLabel?: string;
  intentPrompts?: readonly string[];
  mapSlot?: ReactNode;
  className?: string;
}

export function ListingPremiumSurface({
  hero,
  items,
  facets,
  columns,
  destinationSlug = "valladolid",
  destinationLabel = "Valladolid",
  emptyMessage,
  showAddToTrip = false,
  showFavorite = false,
  presentation = "editorial",
  familyLabel,
  intentPrompts,
  mapSlot,
  className,
}: ListingPremiumSurfaceProps) {
  return (
    <TourismListingSurface
      hero={{
        eyebrow: hero.eyebrow,
        title: hero.title,
        subtitle: hero.subtitle,
        mediaUrl: hero.mediaUrl,
        mediaAlt: hero.mediaAlt,
        metaLabel: hero.metaLabel ?? null,
      }}
      items={items}
      facets={facets ?? []}
      columns={columns}
      destinationSlug={destinationSlug}
      destinationLabel={destinationLabel}
      showAddToTrip={showAddToTrip}
      capabilities={{ showFavorite }}
      presentation={presentation}
      familyLabel={familyLabel}
      intentPrompts={intentPrompts}
      mapSlot={mapSlot}
      emptyMessage={
        emptyMessage ?? "Aún no hay resultados publicados. Explora otros destinos del Oriente Maya."
      }
      className={className}
    />
  );
}

export interface ListingPremiumSurfaceFromDTOProps {
  dto: PublicListingDTO;
  /** Título override cuando la ruta aplica un filtro editorial propio. */
  titleOverride?: string | null;
  subtitleOverride?: string | null;
  facets?: FacetDef[];
  columns?: 1 | 2 | 3;
  showAddToTrip?: boolean;
  showFavorite?: boolean;
  presentation?: PremiumPresentation;
  className?: string;
}

/**
 * Render productivo del listado a partir del contrato público único.
 * Es la ÚNICA vía autorizada para rutas públicas (R1-B).
 */
export function ListingPremiumSurfaceFromDTO({
  dto,
  titleOverride,
  subtitleOverride,
  facets,
  columns,
  showAddToTrip = false,
  showFavorite = false,
  presentation = "editorial",
  className,
}: ListingPremiumSurfaceFromDTOProps) {
  // Perfiles visuales aprobados dentro de la única entrada canónica. Comparten
  // el mismo PublicListingDTO, mapa, Alux, Mi Viaje y expediente de concierge;
  // no crean lecturas ni rutas paralelas.
  if (
    dto.family === "hoteles" ||
    dto.family === "restaurantes" ||
    dto.family === "casas-de-vacaciones"
  ) {
    return <PremiumDiscoveryListingSurface dto={dto} presentation={presentation} />;
  }

  const mediaItems = dto.items.filter((item): item is TourismCardVM & { mediaUrl: string } =>
    Boolean(item.mediaUrl),
  );
  const mapped = dto.items.filter(
    (item): item is TourismCardVM & { coordinates: { lat: number; lng: number } } =>
      item.coordinates?.lat != null && item.coordinates?.lng != null,
  );
  const family = FAMILY_EXPERIENCE[dto.family];
  const defaultFacets = [
    buildDestinationFacet([...dto.items]),
    buildEntityKindFacet([...dto.items]),
  ].filter((facet): facet is FacetDef => facet != null);
  const mapSlot = mapped.length ? (
    <Suspense
      fallback={
        <div className="grid min-h-[26rem] place-items-center text-sm text-muted-foreground">
          Preparando mapa territorial…
        </div>
      }
    >
      <InteractiveMap
        lat={mapped[0].coordinates.lat}
        lng={mapped[0].coordinates.lng}
        zoom={10}
        markerTitle={mapped[0].name}
        markers={mapped.map((item) => ({
          lat: item.coordinates.lat,
          lng: item.coordinates.lng,
          title: item.name,
          href: item.href,
        }))}
        className="min-h-[30rem] h-full"
      />
    </Suspense>
  ) : null;

  return (
    <ListingPremiumSurface
      hero={{
        eyebrow: dto.hero.eyebrow,
        title: titleOverride?.trim() || dto.hero.title,
        subtitle: subtitleOverride?.trim() || dto.hero.subtitle,
        mediaUrl: mediaItems[0]?.mediaUrl ?? null,
        mediaAlt: mediaItems[0]?.mediaAlt ?? mediaItems[0]?.name ?? null,
        metaLabel: dto.hero.metaLabel,
      }}
      items={[...dto.items]}
      facets={facets ?? defaultFacets}
      columns={columns ?? 2}
      destinationSlug={dto.destinationSlug}
      destinationLabel={dto.destinationLabel}
      emptyMessage={dto.emptyMessage}
      showAddToTrip={showAddToTrip}
      showFavorite={showFavorite}
      presentation={presentation}
      familyLabel={family.label}
      intentPrompts={family.prompts}
      mapSlot={mapSlot}
      className={className}
    />
  );
}
