/**
 * EmpresaCard — Adaptador oficial sobre TourismCard (U1.3).
 *
 * H-03 · U1.3: consolida toda la familia de cards en una única
 * Tourism Card. Esta capa preserva la API `{ business }` que consumen
 * `EmpresasSection`, Discovery Cards Registry y cualquier futuro
 * listado, sin fabricar variantes visuales paralelas.
 */
import type { BusinessTeaser } from "@/types/entities";
import { TrustBadge } from "@/components/reviews/TrustBadge";
import {
  resolveBusinessCanonicalUrl,
  toBusinessCardContract,
} from "@/lib/omxds/cards/business-card.adapter";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";

function toVM(business: BusinessTeaser): TourismCardVM {
  const contract = toBusinessCardContract(business);
  const href = contract?.canonicalUrl ?? resolveBusinessCanonicalUrl(business);
  return {
    id: `business:${business.id}`,
    entityKind: "business",
    eyebrow: contract?.category ?? business.category_slug ?? null,
    name: contract?.name ?? business.name,
    href,
    tagline: contract?.summary ?? business.tagline ?? null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: business.name,
    rating: null,
    location:
      (contract?.territory ?? business.destination_slug)
        ? { label: contract?.territory ?? business.destination_slug, distanceKm: null }
        : null,
    territorialContext: null,
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: { label: "Ver empresa", href },
    secondaryAction: null,
  };
}

export function EmpresaCard({ business }: { business: BusinessTeaser }) {
  const vm = toVM(business);
  return (
    <TourismCard
      vm={vm}
      capabilities={{
        showRating: false,
        showPrice: false,
        showDate: false,
        showAvailability: false,
        showDistance: false,
        showFavorite: true,
      }}
      renderActions={() => <TrustBadge subjectKind="business" subjectId={business.id} />}
    />
  );
}
