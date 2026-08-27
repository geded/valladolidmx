/**
 * G8-E · `ListingPremiumSurface` — envoltura productiva de los 6 listados
 * turísticos Premium G5.
 *
 * Autoridad de render: `TourismListingSurface` (Founder Discovery
 * Standard). Esta capa sólo traduce el contenido aprobado a las props de
 * la superficie oficial; no introduce layout paralelo ni chrome global.
 */
import { TourismListingSurface } from "@/components/surfaces/TourismListingSurface";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";

export interface ListingPremiumSurfaceProps {
  hero: {
    eyebrow: string | null;
    title: string;
    subtitle: string | null;
    mediaUrl: string | null;
    mediaAlt: string | null;
  };
  items: TourismCardVM[];
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
      }}
      items={items}
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
