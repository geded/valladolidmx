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

export interface ExperienceLocationVM {
  readonly label: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

/** Bloque de lista condicionado a datos reales (se omite si viene vacío). */
export interface ExperienceListSectionVM {
  readonly title: string;
  readonly items: readonly string[];
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
  /** Qué incluye / no incluye — sólo si la empresa lo publicó. */
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
  /** Itinerario publicado (paso a paso). */
  readonly itinerary: readonly { readonly title: string; readonly detail: string | null }[];
  /** Requisitos, idiomas y accesibilidad publicados. */
  readonly requirements: readonly string[];
  readonly languages: readonly string[];
  readonly accessibility: readonly string[];
  /** Políticas reales (cancelación, condiciones de venta directa). */
  readonly policies: readonly ExperienceListSectionVM[];
  readonly location: ExperienceLocationVM | null;
  /** Valoración sólo cuando existen reseñas reales publicadas. */
  readonly rating: { readonly value: number; readonly count: number } | null;
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
  if (product.duration_minutes && product.duration_minutes > 0) {
    const h = Math.floor(product.duration_minutes / 60);
    const m = product.duration_minutes % 60;
    facts.push({
      label: "Duración",
      value: h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`,
    });
  }
  if (product.capacity && product.capacity > 0) {
    facts.push({ label: "Grupo", value: `Hasta ${product.capacity} personas` });
  }

  const policies: ExperienceListSectionVM[] = [];
  if (product.direct_sale.cancellation_policy) {
    policies.push({
      title: "Política de cancelación",
      items: [product.direct_sale.cancellation_policy],
    });
  }
  if (product.direct_sale.terms) {
    policies.push({ title: "Condiciones de venta", items: [product.direct_sale.terms] });
  }
  if (product.direct_sale.min_lead_hours && product.direct_sale.min_lead_hours > 0) {
    policies.push({
      title: "Anticipación mínima",
      items: [`${product.direct_sale.min_lead_hours} horas antes del inicio`],
    });
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
    directSale: {
      enabled: product.direct_sale.enabled,
      priceAmount: product.direct_sale.price_amount,
      maxQuantity: product.direct_sale.max_quantity,
    },
    hasProvider: Boolean(product.business.id),
  });

  const loc = product.business.primary_location;
  const location: ExperienceLocationVM | null =
    loc && (loc.label || loc.address_line1)
      ? {
          label: loc.label || product.business.display_name,
          address: [loc.address_line1, loc.address_line2].filter(Boolean).join(", ") || null,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }
      : null;

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
    includes: [],
    excludes: [],
    itinerary: [],
    requirements: [],
    languages: [],
    accessibility: [],
    policies,
    location,
    rating:
      product.review_stats.count > 0
        ? { value: product.review_stats.average, count: product.review_stats.count }
        : null,
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
