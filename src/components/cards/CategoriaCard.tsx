/**
 * CategoriaCard — Adaptador oficial sobre TourismCard (U1.3).
 *
 * Mapa slug → ruta top-level preservado; cuando exista /categoria/$slug
 * en Fase 1 se amplía sin tocar consumidores. La representación visual
 * queda unificada bajo la Tourism Card oficial (Single Card Family),
 * usando el gradiente institucional para categorías sin fotografía.
 */
import type { Category } from "@/types/entities";
import { useTranslation } from "@/i18n/context";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";

const ROUTE_BY_SLUG: Partial<Record<string, string>> = {
  experiencias: "/experiencias",
  hoteles: "/hoteles",
  restaurantes: "/restaurantes",
  eventos: "/eventos",
};

function toVM(
  category: Category,
  labels: { explore: string; comingSoon: string },
): TourismCardVM {
  const href = ROUTE_BY_SLUG[category.slug] ?? null;
  return {
    id: `category:${category.id}`,
    entityKind: "category",
    eyebrow: null,
    name: category.name,
    href,
    tagline: category.description,
    businessName: null,
    mediaUrl: null,
    mediaAlt: category.name,
    rating: null,
    location: null,
    territorialContext: null,
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: href ? null : labels.comingSoon,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: href ? { label: labels.explore, href } : null,
    secondaryAction: null,
  };
}

export function CategoriaCard({ category }: { category: Category }) {
  const { t } = useTranslation();
  const vm = toVM(category, {
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
        showAvailability: !ROUTE_BY_SLUG[category.slug],
        showDistance: false,
        showBusiness: false,
        showLocation: false,
        showHighlights: false,
        showFavorite: false,
      }}
    />
  );
}
