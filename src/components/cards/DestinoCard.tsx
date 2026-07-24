/**
 * DestinoCard — Adaptador oficial sobre TourismCard (U1.3).
 *
 * Mantiene la API `{ destination }` y el resolvedor de ruta multi-región
 * (`region_slug → ruta`) para que RegionSurface, Home Destinos y Discovery
 * cards-registry no requieran cambios. Sustituye la card local por la
 * Tourism Card oficial de la biblioteca turística (Single Card Family).
 */
import type { Destination } from "@/types/territory";
import { useTranslation } from "@/i18n/context";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";
import type { OmxdsCardVariant } from "@/lib/omxds/cards/card-contract";
import {
  validateDestinationCardContract,
  type DestinationCardContract,
} from "@/lib/omxds/cards/destination-card.contract";

// Multi-región ready: añadir aquí nuevas regiones cuando existan.
const REGION_TO_HREF: Record<string, (slug: string) => string> = {
  "oriente-maya": (slug) => `/oriente-maya/${slug}`,
};

function toVM(
  destination: Destination,
  labels: { explore: string; comingSoon: string },
): TourismCardVM {
  const builder = REGION_TO_HREF[destination.region_slug];
  const href = builder ? builder(destination.slug) : null;
  return {
    id: `destination:${destination.id}`,
    entityKind: "destination",
    eyebrow: null,
    name: destination.name,
    href,
    tagline: destination.tagline,
    businessName: null,
    mediaUrl: destination.image_url ?? null,
    mediaAlt: `${destination.name} — ${destination.tagline}`,
    rating: null,
    location: null,
    territorialContext: null,
    highlights: [...destination.highlights].slice(0, 3),
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: href ? { label: labels.explore, href } : null,
    secondaryAction: href ? null : { label: labels.comingSoon, href: null },
  };
}

export function DestinoCard({ destination }: { destination: Destination }) {
  const { t } = useTranslation();
  const vm = toVM(destination, {
    explore: t("common.explore"),
    comingSoon: t("common.coming_soon"),
  });
  return (
    <TourismCard
      vm={vm}
      capabilities={{
        showRating: false,
        showPrice: false,
        showDate: false,
        showAvailability: false,
        showDistance: false,
        showBusiness: false,
        showLocation: false,
        showFavorite: true,
      }}
      renderActions={() => (
        <AddToTravelPlanButton
          kind="destination"
          targetId={destination.id}
          title={destination.name}
          slug={destination.slug}
          imageUrl={destination.image_url ?? null}
          subtitle={destination.tagline}
          eligibilityMode="legacy"
        />
      )}
    />
  );
}

export function toDestinationCardContract(
  destination: Destination,
  variant: OmxdsCardVariant = "standard",
): DestinationCardContract | null {
  const builder = REGION_TO_HREF[destination.region_slug];
  const canonicalUrl = builder?.(destination.slug);
  if (!canonicalUrl) return null;
  const contract: DestinationCardContract = {
    family: "destination",
    id: `destination:${destination.id}`,
    name: destination.name,
    territorialType: "Destino",
    identityPromise: destination.tagline,
    parentTerritory: destination.region_slug,
    canonicalUrl,
    media: destination.image_url
      ? {
          url: destination.image_url,
          alt: `${destination.name} — ${destination.tagline}`,
          focalPoint: "center",
        }
      : null,
    reasons: [...destination.highlights].slice(0, 3),
    variant,
    state: destination.image_url ? "ready" : "no_media",
    actions: [{ id: "discover", label: "Descubrir destino", href: canonicalUrl }],
  };
  return validateDestinationCardContract(contract).valid ? contract : null;
}
