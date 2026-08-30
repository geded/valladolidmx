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
import { TourismListingSurface, type FacetDef } from "@/components/surfaces/TourismListingSurface";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";

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
  className?: string;
}

export function ListingPremiumSurface({
  hero,
  items,
  facets,
  columns = 3,
  destinationSlug = "valladolid",
  destinationLabel = "Valladolid",
  emptyMessage,
  showAddToTrip = false,
  showFavorite = false,
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
  columns = 3,
  showAddToTrip = false,
  showFavorite = false,
  className,
}: ListingPremiumSurfaceFromDTOProps) {
  return (
    <ListingPremiumSurface
      hero={{
        eyebrow: dto.hero.eyebrow,
        title: titleOverride?.trim() || dto.hero.title,
        subtitle: subtitleOverride?.trim() || dto.hero.subtitle,
        mediaUrl: null,
        mediaAlt: null,
        metaLabel: dto.hero.metaLabel,
      }}
      items={[...dto.items]}
      facets={facets}
      columns={columns}
      destinationSlug={dto.destinationSlug}
      destinationLabel={dto.destinationLabel}
      emptyMessage={dto.emptyMessage}
      showAddToTrip={showAddToTrip}
      showFavorite={showFavorite}
      className={className}
    />
  );
}
