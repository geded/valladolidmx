/**
 * Experiencias · Modelo de vista de la ficha canónica.
 *
 * Capa PURA: proyecta el detalle real del producto (`/producto/{slug}`,
 * familia canónica `experience` / `tour`) al VM render-only que consume
 * `ExperiencePremiumSurface`. Cero contenido inventado: toda sección sin
 * dato real se omite.
 */
import type { MarketplaceProductDetail } from "@/lib/catalog/marketplace-reads.functions";
import {
  resolveExperienceCommerce,
  type ExperienceCommerceDecision,
} from "@/lib/experiences/experience-commerce";
import { resolveCanonicalPath } from "@/lib/navigation/canonical-paths";

export interface ExperienceMediaVM {
  readonly url: string;
  readonly alt: string;
}

export interface ExperienceFactVM {
  readonly label: string;
  readonly value: string;
}

export interface ExperienceRelatedVM {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly note: string;
  readonly media: ExperienceMediaVM | null;
}

export interface ExperiencePremiumVM {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly tagline: string | null;
  readonly description: string;
  readonly operatorName: string;
  readonly operatorHref: string | null;
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly cover: ExperienceMediaVM | null;
  readonly gallery: readonly ExperienceMediaVM[];
  readonly facts: readonly ExperienceFactVM[];
  readonly faqs: readonly { readonly question: string; readonly answer: string }[];
  readonly related: readonly ExperienceRelatedVM[];
  readonly commerce: ExperienceCommerceDecision;
  /** Aviso visible sólo en superficies de revisión interna. */
  readonly demoNotice: string | null;
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildExperienceVMFromProduct(
  product: MarketplaceProductDetail,
): ExperiencePremiumVM {
  const cover = product.cover_url
    ? { url: product.cover_url, alt: `${product.name} — ${product.business.display_name}` }
    : null;
  const gallery = product.media
    .filter((item) => Boolean(item.url))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ url: item.url as string, alt: item.alt ?? product.name }));

  const destinationSlug = product.business.destination_slug || null;
  const categorySlug = product.business.category_slug || null;
  const operatorHref =
    destinationSlug && categorySlug
      ? resolveCanonicalPath({
          kind: "business",
          slug: product.business.slug,
          category: categorySlug,
          destination: destinationSlug,
        })
      : null;

  const facts: ExperienceFactVM[] = [];
  if (product.product_type) facts.push({ label: "Tipo", value: humanize(product.product_type) });
  if (destinationSlug) facts.push({ label: "Destino", value: humanize(destinationSlug) });
  if (product.business.primary_location?.label) {
    facts.push({ label: "Punto de encuentro", value: product.business.primary_location.label });
  }
  if (product.requires_availability) {
    facts.push({ label: "Disponibilidad", value: "Sujeta a confirmación del operador" });
  }

  const commerce = resolveExperienceCommerce({
    conversionMode: product.conversion_mode,
    acceptsOnlinePayment: product.accepts_online_payment,
    requiresAvailability: product.requires_availability,
    priceAmount: product.price_amount,
    priceCurrency: product.price_currency,
    primaryActionLabel: product.primary_action_label,
    secondaryActionLabel: product.secondary_action_label,
    contact: product.business.primary_contact,
  });

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    eyebrow: product.product_type ? humanize(product.product_type) : "Experiencia",
    tagline: product.tagline || null,
    description: product.description || "",
    operatorName: product.business.display_name,
    operatorHref,
    destinationSlug,
    destinationLabel: destinationSlug ? humanize(destinationSlug) : null,
    cover,
    gallery,
    facts,
    faqs: product.faqs
      .filter((faq) => Boolean(faq.question && faq.answer))
      .map((faq) => ({ question: faq.question, answer: faq.answer })),
    related: product.related.slice(0, 6).map((item) => ({
      id: item.id,
      name: item.name,
      href: `/producto/${item.slug}`,
      note: item.tagline || product.business.display_name,
      media: item.cover_url ? { url: item.cover_url, alt: item.name } : null,
    })),
    commerce,
    demoNotice: null,
  };
}
