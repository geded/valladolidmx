/**
 * U-VISUAL · V3 — Adapters oficiales `→ TourismCardVM`.
 *
 * Concentra la conversión de cada feed público (empresas, promociones,
 * eventos, destinos, promo landings) al VM único de la Tourism Card.
 * Cero lógica de negocio nueva: se limitan a proyectar campos ya
 * disponibles al contrato oficial y a delegar en `resolveCanonicalPath`
 * para los hrefs — respeta Navigation Blueprint v1.0 y Tourism Component
 * Library (Regla Single Card Family).
 */
import type {
  MarketplaceBusinessCard,
  MarketplacePromotionCard,
} from "@/lib/catalog/marketplace-reads.functions";
import type { PublicEventCard } from "@/lib/events/public-reads.functions";
import type { Destination } from "@/types/territory";
import type {
  TourismCardVM,
  TourismEntityKind,
} from "@/components/experience-builder/tourism-card/TourismCard";
import { resolveCanonicalPath } from "@/lib/navigation";
import { PUEBLOS_MAGICOS_AUTORIZADOS } from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function humanizeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function institutionalBadgesForDestination(
  destinoSlug: string | null | undefined,
): TourismCardVM["institutionalBadges"] {
  if (!destinoSlug) return [];
  const out: TourismCardVM["institutionalBadges"] = [];
  if ((PUEBLOS_MAGICOS_AUTORIZADOS as readonly string[]).includes(destinoSlug)) {
    out.push({ label: "Pueblo Mágico", tone: "primary" });
  }
  out.push({ label: "Oriente Maya", tone: "info" });
  return out;
}

function categoryToEntityKind(
  categorySlug: string | null | undefined,
): TourismEntityKind {
  if (!categorySlug) return "business";
  const s = categorySlug.toLowerCase();
  if (["hoteles", "hospedaje"].includes(s)) return "hotel";
  if (["restaurantes", "gastronomia"].includes(s)) return "restaurant";
  if (["experiencias", "experiencias-tours", "tours"].includes(s)) return "experience";
  if (
    ["casas-de-vacaciones", "casas-vacacionales", "villas", "rentas-vacacionales", "airbnb", "casas"].includes(
      s,
    )
  )
    return "hotel";
  return "business";
}

function categoryToEyebrowLabel(
  categorySlug: string | null | undefined,
): string | null {
  const map: Record<string, string> = {
    hoteles: "Hospedaje",
    hospedaje: "Hospedaje",
    "casas-de-vacaciones": "Casa de vacaciones",
    villas: "Villa",
    restaurantes: "Restaurante",
    gastronomia: "Gastronomía",
    experiencias: "Experiencia",
    "experiencias-tours": "Experiencia",
    tours: "Tour",
  };
  if (!categorySlug) return null;
  return map[categorySlug.toLowerCase()] ?? humanizeSlug(categorySlug);
}

/* ------------------------------------------------------------------ *
 * Business → TourismCardVM
 * ------------------------------------------------------------------ */
export interface BusinessAdapterOptions {
  destinationLabel?: string | null;
  regionLabel?: string | null;
  /** Categoría forzada para el eyebrow (por si el feed no la trae). */
  forcedCategorySlug?: string | null;
}

export function businessToTourismCard(
  b: MarketplaceBusinessCard,
  opts: BusinessAdapterOptions = {},
): TourismCardVM {
  const categorySlug = opts.forcedCategorySlug ?? b.category_slug ?? null;
  const destinationLabel =
    opts.destinationLabel ?? humanizeSlug(b.destination_slug) ?? null;
  const href =
    b.destination_slug && categorySlug
      ? resolveCanonicalPath({
          kind: "business",
          slug: b.slug,
          category: categorySlug,
          destination: b.destination_slug,
        })
      : `/marketplace/${b.slug}`;
  const verifiedBadges: TourismCardVM["badges"] = b.verified
    ? [{ label: "Verificada", tone: "primary" }]
    : [];
  // Ola 7.4.a · Badge de paquete de visibilidad (Destacado/Premium/Élite…)
  const allowedTones = new Set(["default", "primary", "success", "warning", "info"]);
  const rawTone = (b.visibility_badge_variant ?? "").toLowerCase();
  const visibilityTone = (allowedTones.has(rawTone) ? rawTone : "primary") as
    TourismCardVM["badges"][number]["tone"];
  const visibilityBadges: TourismCardVM["badges"] = b.visibility_plan_name
    ? [{ label: b.visibility_plan_name, tone: visibilityTone }]
    : [];
  // Ola 7.8 · Founder Spotlight (sobre-exposición manual)
  const spotlightBadges: TourismCardVM["badges"] = (b as {
    spotlight_headline?: string | null;
    spotlight_boost?: number;
  }).spotlight_headline || ((b as { spotlight_boost?: number }).spotlight_boost ?? 0) > 0
    ? [
        {
          label:
            (b as { spotlight_headline?: string | null }).spotlight_headline ||
            "Destacado por Valladolid",
          tone: "warning",
        },
      ]
    : [];
  return {
    id: b.id,
    entityKind: categoryToEntityKind(categorySlug),
    eyebrow: categoryToEyebrowLabel(categorySlug),
    name: b.display_name,
    href,
    tagline: b.tagline || null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: destinationLabel
      ? { label: destinationLabel, distanceKm: null }
      : null,
    coordinates:
      b.latitude != null && b.longitude != null
        ? { lat: Number(b.latitude), lng: Number(b.longitude) }
        : null,
    territorialContext: opts.regionLabel ?? null,
    highlights: [],
    badges: [...spotlightBadges, ...visibilityBadges, ...verifiedBadges],
    institutionalBadges: institutionalBadgesForDestination(b.destination_slug),
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Event → TourismCardVM
 * ------------------------------------------------------------------ */
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function eventToTourismCard(e: PublicEventCard): TourismCardVM {
  const destinationLabel = humanizeSlug(e.destination_slug);
  const dateLabel =
    formatDate(e.starts_at) +
    (e.ends_at ? ` – ${formatDate(e.ends_at)}` : "");
  return {
    id: e.id,
    entityKind: "event",
    eyebrow: "Evento",
    name: e.title,
    href: `/eventos/${e.slug}`,
    tagline: e.summary || null,
    businessName: e.venue_name || null,
    mediaUrl: e.cover_url || null,
    mediaAlt: e.title,
    rating: null,
    location: destinationLabel
      ? { label: destinationLabel, distanceKm: null }
      : null,
    territorialContext: null,
    highlights: [],
    badges: e.is_free ? [{ label: "Entrada libre", tone: "success" }] : [],
    institutionalBadges: institutionalBadgesForDestination(e.destination_slug),
    dateLabel,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Promotion (marketplace) → TourismCardVM
 * ------------------------------------------------------------------ */
export function promotionToTourismCard(
  p: MarketplacePromotionCard,
): TourismCardVM {
  const discount =
    p.discount_percent != null && p.discount_percent > 0
      ? [
          {
            label: `-${Math.round(Number(p.discount_percent))}%`,
            tone: "warning" as const,
          },
        ]
      : [];
  return {
    id: p.id,
    entityKind: "promotion",
    eyebrow: "Promoción",
    name: p.title,
    href: p.business_slug ? `/marketplace/${p.business_slug}#promo-${p.slug}` : null,
    tagline: p.description || null,
    businessName: p.business_name || null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: null,
    territorialContext: null,
    highlights: [],
    badges: discount,
    institutionalBadges: [],
    dateLabel: formatDate(p.ends_at) ? `Hasta ${formatDate(p.ends_at)}` : null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Promotion Landing (page_compositions) → TourismCardVM
 * ------------------------------------------------------------------ */
export interface PromoLandingLike {
  slug: string;
  title: string;
  description: string | null;
  businessName?: string | null;
  discountPercent?: number | null;
  endsAt?: string | null;
}

export function promoLandingToTourismCard(p: PromoLandingLike): TourismCardVM {
  const badges: TourismCardVM["badges"] = [];
  if (typeof p.discountPercent === "number" && p.discountPercent > 0) {
    badges.push({ label: `-${p.discountPercent}%`, tone: "success" });
  }
  let dateLabel: string | null = null;
  if (p.endsAt) {
    try {
      dateLabel = `Vigente hasta ${new Date(p.endsAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Merida" })}`;
    } catch {
      dateLabel = null;
    }
  }
  return {
    id: p.slug,
    entityKind: "promotion",
    eyebrow: p.businessName ?? "Campaña",
    name: p.title,
    href: `/l/${p.slug}`,
    tagline: p.description,
    businessName: p.businessName ?? null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: null,
    territorialContext: null,
    highlights: [],
    badges,
    institutionalBadges: [],
    dateLabel,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Destination → TourismCardVM
 * ------------------------------------------------------------------ */
export function destinationToTourismCard(d: Destination): TourismCardVM {
  return {
    id: d.id,
    entityKind: "destination",
    eyebrow: "Destino",
    name: d.name,
    href: `/oriente-maya/${d.slug}`,
    tagline: d.tagline || null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: null,
    territorialContext: "Oriente Maya",
    highlights: (d.highlights ?? []).slice(0, 3),
    badges: [],
    institutionalBadges: institutionalBadgesForDestination(d.slug),
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Institutional badges strip helper reutilizable en la superficie.
 * ------------------------------------------------------------------ */
export { institutionalBadgesForDestination };
export { humanizeSlug };