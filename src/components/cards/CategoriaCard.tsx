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
import { TourismCategoryIcon } from "@/components/omxds/TourismCategoryIcon";
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

function toVM(category: Category, labels: { explore: string; comingSoon: string }): TourismCardVM {
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
    // G6-S1-A · D-G6-02: los controles reales de la tarjeta (enlace de
    // título y CTA) quedan garantizados en 44×44 px con foco visible.
    <div
      className="relative min-w-0 [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:min-w-[44px] [&_a]:items-center [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-ring [&_button]:min-h-[44px] [&_button]:min-w-[44px]"
      data-omxds-touch-target="44"
    >
      <span className="pointer-events-none absolute left-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 shadow-soft ring-1 ring-border/60">
        {/* G6-S1 · autoridad única de iconografía (fail-closed) */}
        <TourismCategoryIcon slug={category.slug} variant="compact" size={32} />
      </span>
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
    </div>
  );
}

