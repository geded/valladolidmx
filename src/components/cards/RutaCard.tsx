/**
 * RutaCard — Adaptador oficial sobre TourismCard (U1.3).
 *
 * Mantiene la API `{ route }` que consumen `RutasSection` y el Discovery
 * cards-registry. Consolida la card bajo la biblioteca oficial y
 * traslada duración/destinos como dateLabel + highlight.
 */
import type { SuggestedRoute } from "@/types/entities";
import { useTranslation } from "@/i18n/context";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";

function toVM(
  route: SuggestedRoute,
  labels: { days: string; destinationsLabel: (n: number) => string },
): TourismCardVM {
  return {
    id: `route:${route.id}`,
    entityKind: "route",
    eyebrow: null,
    name: route.name,
    href: null,
    tagline: route.summary,
    businessName: null,
    mediaUrl: null,
    mediaAlt: route.name,
    rating: null,
    location: null,
    territorialContext: null,
    highlights: [labels.destinationsLabel(route.destination_slugs.length)],
    badges: [],
    institutionalBadges: [],
    dateLabel: `${route.duration_days} ${labels.days}`,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

export function RutaCard({ route }: { route: SuggestedRoute }) {
  const { t } = useTranslation();
  const vm = toVM(route, {
    days: t("common.days"),
    destinationsLabel: (n) => `${n} destinos`,
  });
  return (
    <TourismCard
      vm={vm}
      capabilities={{
        showRating: false,
        showPrice: false,
        showAvailability: false,
        showDistance: false,
        showBusiness: false,
        showLocation: false,
        showFavorite: false,
      }}
    />
  );
}
