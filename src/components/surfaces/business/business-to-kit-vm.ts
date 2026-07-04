/**
 * Business → Surface Kit ViewModel mappers (US-R3 · Sub-ola 2.5c).
 *
 * Único puente entre `MarketplaceBusinessDetail` y los ViewModels neutros
 * del Surface Kit. El mapeo vive FUERA del Kit (Kit sigue ViewModel-only).
 *
 * Reglas Sub-ola 2.5c:
 *  - Los shims `vmx.business.*` importan estas funciones para construir
 *    los VMs que consumen los primitives del Kit.
 *  - Los shims que se mantienen como composites (justificados por no
 *    tener primitive equivalente sin pérdida visual) también consumen
 *    estos mappers para uniformar la forma de los datos, dejando lista
 *    la absorción por primitives futuros del Kit.
 */
import type {
  BadgeVM,
  CardVM,
  CrumbVM,
  InfoRowVM,
  PromoVM,
  ShellVM,
} from "@/components/surfaces/kit/types";
import type {
  MarketplaceBusinessDetail,
  MarketplaceProductCard,
  MarketplacePromotionCard,
} from "@/lib/marketplace/marketplace-reads.functions";
import { resolveBusinessVariant } from "@/components/surfaces/BusinessSurface";

export function businessToShellVM(b: MarketplaceBusinessDetail): ShellVM {
  const variant = resolveBusinessVariant(b.category_slug);
  return {
    eyebrow: variant.eyebrow,
    title: b.display_name,
    description: b.tagline ?? undefined,
    crumbs: [
      { label: "Catálogo", href: "/marketplace" },
      { label: b.display_name },
    ] satisfies CrumbVM[],
  };
}

export function businessToHeaderBadgeVMs(
  b: MarketplaceBusinessDetail,
): BadgeVM[] {
  if (!b.verified) return [];
  return [{ label: "Verificado", tone: "primary" }];
}

export function businessToInfoRowVMs(
  b: MarketplaceBusinessDetail,
): InfoRowVM[] {
  return [
    { label: "Destino", value: b.destination_slug || "—" },
    { label: "Categoría", value: b.category_slug || "—" },
    { label: "Verificado", value: b.verified ? "Sí" : "No" },
    { label: "Plan", value: b.plan_tier },
  ];
}

/**
 * Los CardVM de productos de Business viajan SIN `price` porque la ficha
 * canónica usa el formato legacy (`${currency} ${amount.toFixed(2)}`) y
 * el Kit formatea con `Intl.NumberFormat`. El shim inyecta el bloque de
 * precio dentro del composite; el mapper mantiene la forma neutra.
 */
export function businessToProductCardVMs(
  b: MarketplaceBusinessDetail,
): CardVM[] {
  return b.products.map((p: MarketplaceProductCard) => ({
    id: p.id,
    eyebrow: p.product_type,
    title: p.name,
    tagline: p.tagline ?? undefined,
  }));
}

export function businessToPromoVMs(
  b: MarketplaceBusinessDetail,
): PromoVM[] {
  return b.promotions.map((p: MarketplacePromotionCard) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    discountPercent: p.discount_percent,
  }));
}