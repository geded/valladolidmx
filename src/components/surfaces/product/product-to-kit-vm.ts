/**
 * Product → Surface Kit ViewModel mappers (US-R3 · Sub-ola 2.5b).
 *
 * Único puente entre `MarketplaceProductDetail` y los ViewModels neutros
 * del Surface Kit. El mapeo vive FUERA del Kit (Kit sigue ViewModel-only).
 * Los shims `vmx.product.*` importan estas funciones para construir los
 * VMs y pasarlos a los primitives del Kit.
 */
import type {
  CardVM,
  CrumbVM,
  FaqVM,
  GalleryVM,
  HeroVM,
  MediaVM,
  PriceCtaVM,
  PriceVM,
  PromoVM,
  ReviewVM,
  ShellVM,
  RichTextVM,
} from "@/components/surfaces/kit/types";
import type {
  MarketplaceProductCard,
  MarketplaceProductDetail,
  ProductMediaItem,
} from "@/lib/marketplace/marketplace-reads.functions";

export function productToShellVM(p: MarketplaceProductDetail): ShellVM {
  return {
    crumbs: [
      { label: "Marketplace", href: "/marketplace" },
      { label: p.business.display_name, href: `/marketplace/${p.business.slug}` },
      { label: p.name },
    ] satisfies CrumbVM[],
  };
}

export function productToHeroVM(p: MarketplaceProductDetail): HeroVM {
  return {
    eyebrow: p.product_type,
    title: p.name,
    subtitle: p.tagline || undefined,
  };
}

function coverAndGallery(p: MarketplaceProductDetail): {
  cover: ProductMediaItem | null;
  gallery: ProductMediaItem[];
} {
  const cover = p.media.find((m) => m.role === "cover") ?? p.media[0] ?? null;
  const gallery = p.media.filter((m) => m.id !== cover?.id);
  return { cover, gallery };
}

export function productToGalleryVM(p: MarketplaceProductDetail): GalleryVM {
  const { cover, gallery } = coverAndGallery(p);
  const coverVM: MediaVM | null = cover?.url
    ? { id: cover.id, url: cover.url, alt: cover.alt ?? p.name }
    : null;
  return {
    cover: coverVM,
    // Mantener alt="" cuando el media original no lo trae (no aplicar fallback).
    items: gallery
      .filter((m): m is ProductMediaItem & { url: string } => !!m.url)
      .map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "" })),
    emptyLabel: "Sin fotografías. Súbelas desde el CMS de producto.",
  };
}

function priceOf(p: MarketplaceProductDetail): PriceVM | null {
  if (p.price_amount == null) return null;
  return { amount: p.price_amount, currency: p.price_currency || "MXN" };
}

export function productToPriceCtaVM(
  p: MarketplaceProductDetail,
  actions: React.ReactNode,
): PriceCtaVM {
  return {
    price: priceOf(p),
    mode: p.conversion_mode,
    sticky: true,
    fallbackLabel: "Precio bajo consulta",
    actions,
  };
}

export function productToDescriptionVM(
  p: MarketplaceProductDetail,
): RichTextVM {
  return {
    heading: "Descripción",
    body: p.description || null,
    emptyLabel: "Sin descripción. Añádela desde el CMS de producto.",
  };
}

export function productToPromoVMs(p: MarketplaceProductDetail): PromoVM[] {
  return p.promotions.map((pr) => ({
    id: pr.id,
    title: pr.title,
    description: pr.description,
    discountPercent: pr.discount_percent,
  }));
}

export function productToReviewVMs(p: MarketplaceProductDetail): ReviewVM[] {
  return p.reviews.map((r) => ({
    id: r.id,
    author: r.author_display_name,
    rating: r.rating,
    title: r.title ?? undefined,
    body: r.body,
  }));
}

export function productToFaqVMs(p: MarketplaceProductDetail): FaqVM[] {
  return p.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }));
}

export function productToRelatedCardVMs(
  p: MarketplaceProductDetail,
): CardVM[] {
  return p.related.map((r: MarketplaceProductCard) => ({
    id: r.id,
    href: `/producto/${r.slug}`,
    eyebrow: r.product_type,
    title: r.name,
    tagline: r.tagline || undefined,
    price:
      r.price_amount != null
        ? { amount: r.price_amount, currency: r.price_currency || "MXN" }
        : null,
  }));
}