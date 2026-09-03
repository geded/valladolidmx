/**
 * G8-Q2D-B · Contrato público de Lugares y Atractivos + adaptador tipado
 * `PublicPlaceDTO → PlacePremiumContent`.
 *
 * Módulo PURO (sin red, sin base de datos, sin React) para poder ejercerlo
 * desde los contratos automatizados de `validate:q2d:b`.
 *
 * Reglas vinculantes (autorización Founder G8-Q2D-B):
 *  - Prohibido usar fixtures, contenido inventado o información de otro
 *    destino/lugar para completar campos ausentes.
 *  - Un campo vacío OCULTA su sección: nunca se rellena con demo.
 *  - Sólo se consumen medios asociados al propio lugar. Sin fotografía
 *    acreditada se usa el marcador neutral aprobado en G8-Q2D-0.
 *  - La portada cinematográfica exige activo gobernado y aprobado; en su
 *    ausencia la superficie cae a Editorial (regla fail-closed Q2D-A).
 */
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import type { TourismFilterAttributes } from "@/lib/business-attributes/types";
import {
  getPlacePremiumVariant,
  resolvePlacePresentation,
  type PlacePresentationResolution,
} from "@/components/place-premium/place-premium-config";
import type {
  PlacePremiumContent,
  PlacePremiumMedia,
} from "@/components/place-premium/place-premium-content";

/* ─────────────────────────────  DTO público  ───────────────────────────── */

export interface PublicPlaceMediaDTO {
  mediaAssetId: string | null;
  url: string | null;
  alt: string | null;
  credit: string | null;
  caption: string | null;
  role: string;
  sortOrder: number;
  /** Activo gobernado y aprobado (`review_state = 'approved'`). */
  approved: boolean;
  aiGenerated: boolean;
  focal?: { x: number; y: number } | null;
}

export interface PublicPlaceHoursDTO {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  notes: string | null;
}

export interface PublicPlaceRelatedDTO {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  media: PublicPlaceMediaDTO | null;
}

export interface PublicPlaceDTO {
  id: string;
  slug: string;
  name: string;
  officialName: string | null;
  status: string;
  typeSlug: string | null;
  typeLabel: string | null;
  destination: { slug: string; name: string };
  zone: { id: string; name: string } | null;
  regionLabel: string;
  description: string | null;
  shortDescription: string | null;
  highlights: string[];
  latitude: number | null;
  longitude: number | null;
  addressLine: string | null;
  directions: string | null;
  hours: PublicPlaceHoursDTO[];
  admissionKind: string | null;
  entryFeeNotes: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  priceCurrency: string | null;
  visitDurationMinutes: number | null;
  bestTimeToVisit: string | null;
  accessibility: string[];
  amenities: string[];
  contact: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
  };
  socialLinks: Record<string, string>;
  categories: Array<{ slug: string; name: string }>;
  media: PublicPlaceMediaDTO[];
  authorities: Array<{ kind: string; name: string; isPrimary: boolean }>;
  products: PublicPlaceRelatedDTO[];
  events: PublicPlaceRelatedDTO[];
  /** Dirección persistida por el administrador (`metadata.presentation_mode`). */
  presentationMode: PremiumPresentation | null;
  seo: { title: string | null; description: string | null } | null;
}

/**
 * G4-PLACES · Tarjeta pública del listado territorial de Lugares.
 * Proyección ligera de `points_of_interest` (sólo lecturas reales):
 * los campos no capturados llegan en `null`/`[]` y se omiten en la UI.
 */
export interface PublicPlaceCard {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  type_slug: string | null;
  type_label: string | null;
  destination_slug: string | null;
  destination_name: string | null;
  zone_name: string | null;
  latitude: number | null;
  longitude: number | null;
  admission_kind: string | null;
  price_from: number | null;
  price_to: number | null;
  price_currency: string | null;
  visit_duration_minutes: number | null;
  best_time_to_visit: string | null;
  amenities: string[];
  accessibility: string[];
  categories: Array<{ slug: string; name: string }>;
  /** Portada gobernada y aprobada del propio lugar; nunca medios ajenos. */
  cover_url: string | null;
  /**
   * Atributos estructurados derivados EXCLUSIVAMENTE de columnas reales
   * (place_type, experience_category, admission_type, zone, accessibility,
   * amenities, duration, best_time). Vacío cuando no hay captura.
   */
  filter_attributes: TourismFilterAttributes;
}

/* ───────────────────────────────  JSON-LD  ─────────────────────────────── */

/**
 * `@type` de Schema.org por tipo de lugar. Cubre los 15 tipos del catálogo
 * Q2A (no sólo las seis variantes premium) y nunca inventa un tipo:
 * lo desconocido cae en `TouristAttraction`.
 */
const JSON_LD_BY_TYPE: Record<string, string> = {
  "zona-arqueologica": "LandmarksOrHistoricalBuildings",
  "monumento-historico": "LandmarksOrHistoricalBuildings",
  hacienda: "LandmarksOrHistoricalBuildings",
  museo: "Museum",
  "centro-cultural": "Museum",
  "templo-convento": "PlaceOfWorship",
  cenote: "BodyOfWater",
  "cuerpo-de-agua": "BodyOfWater",
  "area-natural": "TouristAttraction",
  gruta: "TouristAttraction",
  mirador: "TouristAttraction",
  "plaza-parque": "TouristAttraction",
  "calle-emblematica": "TouristAttraction",
  "mercado-artesanal": "Place",
  otro: "TouristAttraction",
};

export function placeJsonLdType(typeSlug: string | null | undefined): string {
  if (typeof typeSlug !== "string") return "TouristAttraction";
  return JSON_LD_BY_TYPE[typeSlug.trim().toLowerCase()] ?? "TouristAttraction";
}

/* ───────────────────────────────  Medios  ──────────────────────────────── */

export const PLACE_NEUTRAL_PLACEHOLDER_CREDIT =
  "Sin fotografía acreditada del lugar · marcador neutral · no representa otro sitio";

/** Marcador neutral aprobado (G8-Q2D-0). Nunca hereda imágenes ajenas. */
export function neutralPlaceholder(label: string): PlacePremiumMedia {
  return {
    url: null,
    alt: label,
    credit: PLACE_NEUTRAL_PLACEHOLDER_CREDIT,
    placeholderLabel: label,
  };
}

/** Un nombre de archivo nunca puede funcionar como ALT accesible. */
function safeAlt(alt: string | null, fallback: string): string {
  const value = (alt ?? "").trim();
  if (!value) return fallback;
  if (/^[\w .()-]+\.(jpe?g|png|webp|avif|gif|heic|tiff?)$/i.test(value)) return fallback;
  return value;
}

export function toSurfaceMedia(
  media: PublicPlaceMediaDTO | null | undefined,
  fallbackLabel: string,
): PlacePremiumMedia {
  if (!media || !media.url) return neutralPlaceholder(fallbackLabel);
  return {
    url: media.url,
    alt: safeAlt(media.alt, fallbackLabel),
    credit: (media.credit ?? "").trim(),
  };
}

/** Portada gobernada: sólo un activo del propio lugar, aprobado y con URL. */
export function findApprovedCover(
  media: readonly PublicPlaceMediaDTO[],
): PublicPlaceMediaDTO | null {
  const covers = media.filter((m) => m.approved && Boolean(m.url));
  if (covers.length === 0) return null;
  return covers.find((m) => m.role === "cover") ?? covers[0];
}

/* ─────────────────────────────  Territorio  ────────────────────────────── */

export function buildPlaceBreadcrumbs(dto: PublicPlaceDTO) {
  // Cadena aprobada: Inicio > Oriente Maya > Destino > Lugares y sitios de
  // interés > Lugar. El nivel de familia enlaza al listado contextual del
  // destino; la zona se comunica en la ficha, no en el breadcrumb.
  const crumbs: { label: string; href?: string }[] = [
    { label: "Inicio", href: "/" },
    { label: "Oriente Maya", href: "/oriente-maya" },
    { label: dto.destination.name, href: `/oriente-maya/${dto.destination.slug}` },
    {
      label: "Lugares y sitios de interés",
      href: `/oriente-maya/${dto.destination.slug}/lugares`,
    },
  ];
  crumbs.push({ label: dto.name });
  return crumbs;
}

export function placeCanonicalPath(dto: { destination: { slug: string }; slug: string }): string {
  return `/oriente-maya/${dto.destination.slug}/lugares/${dto.slug}`;
}

/* ───────────────────────────────  Horarios  ────────────────────────────── */

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function formatPlaceHours(hours: readonly PublicPlaceHoursDTO[]): string[] {
  return hours
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((h) => {
      const day = DAY_LABELS[h.dayOfWeek] ?? `Día ${h.dayOfWeek}`;
      if (h.isClosed) return `${day}: cerrado`;
      if (h.opensAt && h.closesAt) return `${day}: ${h.opensAt} – ${h.closesAt}`;
      return `${day}: ${h.notes?.trim() || "horario por confirmar"}`;
    });
}

const ADMISSION_LABELS: Record<string, string> = {
  gratuito: "Entrada gratuita",
  pago: "Entrada de pago",
  mixto: "Entrada mixta",
  no_aplica: "No aplica",
};

function priceLabel(dto: PublicPlaceDTO): string | null {
  const currency = dto.priceCurrency || "MXN";
  if (dto.priceFrom != null && dto.priceTo != null && dto.priceTo !== dto.priceFrom)
    return `${dto.priceFrom} – ${dto.priceTo} ${currency}`;
  if (dto.priceFrom != null) return `Desde ${dto.priceFrom} ${currency}`;
  if (dto.priceTo != null) return `Hasta ${dto.priceTo} ${currency}`;
  return null;
}

/* ──────────────────────────────  Adaptador  ────────────────────────────── */

export interface PlaceSurfaceProjection {
  content: PlacePremiumContent;
  variant: string | null;
  resolution: PlacePresentationResolution;
  presentation: PremiumPresentation;
  hasApprovedCover: boolean;
  jsonLdType: string;
  canonicalPath: string;
}

/**
 * Adaptador único `PublicPlaceDTO → PlacePremiumSurface`.
 * Todo campo ausente produce una sección vacía (y por tanto oculta).
 */
export function adaptPlaceToPremiumSurface(dto: PublicPlaceDTO): PlaceSurfaceProjection {
  const variantDef = getPlacePremiumVariant(dto.typeSlug);
  const cover = findApprovedCover(dto.media);
  const hasApprovedCover = Boolean(cover);

  const resolution = resolvePlacePresentation({
    variant: dto.typeSlug,
    requested: dto.presentationMode,
    hasApprovedCover,
  });

  const typeLabel = dto.typeLabel ?? variantDef?.label ?? "Lugar y atractivo";
  const placeholderLabel = `Fotografía pendiente · ${dto.name}`;

  const supporting = dto.media
    .filter((m) => m.url && m !== cover && m.role !== "cover")
    .slice(0, 4)
    .map((m) => toSurfaceMedia(m, placeholderLabel));

  const galleryItems = dto.media
    .filter((m) => m.url)
    .map((m) => toSurfaceMedia(m, placeholderLabel));

  const facts: PlacePremiumContent["essentials"]["facts"] = [];
  if (dto.admissionKind)
    facts.push({
      key: "admission",
      label: "Admisión",
      value: ADMISSION_LABELS[dto.admissionKind] ?? dto.admissionKind,
      hint: dto.entryFeeNotes?.trim() || undefined,
    });
  const price = priceLabel(dto);
  if (price) facts.push({ key: "price", label: "Precio", value: price });
  if (dto.visitDurationMinutes)
    facts.push({
      key: "duration",
      label: "Duración sugerida",
      value: `${dto.visitDurationMinutes} minutos`,
    });
  if (dto.bestTimeToVisit)
    facts.push({ key: "best-time", label: "Mejor momento", value: dto.bestTimeToVisit });
  for (const line of formatPlaceHours(dto.hours)) {
    facts.push({ key: `hours-${line}`, label: "Horario", value: line });
  }
  if (dto.addressLine) facts.push({ key: "address", label: "Dirección", value: dto.addressLine });
  if (dto.contact.website)
    facts.push({ key: "website", label: "Sitio web", value: dto.contact.website });
  if (dto.contact.phone) facts.push({ key: "phone", label: "Teléfono", value: dto.contact.phone });
  if (dto.contact.whatsapp)
    facts.push({ key: "whatsapp", label: "WhatsApp", value: dto.contact.whatsapp });
  if (dto.contact.email) facts.push({ key: "email", label: "Correo", value: dto.contact.email });
  for (const authority of dto.authorities) {
    facts.push({
      key: `authority-${authority.name}`,
      label: authority.kind,
      value: authority.name,
    });
  }

  const paragraphs = [dto.description?.trim(), dto.shortDescription?.trim()].filter(
    (value): value is string => Boolean(value && value.length > 0),
  );
  const introParagraphs = dto.description?.trim()
    ? dto.description
        .split(/\n{2,}/u)
        .map((p) => p.trim())
        .filter(Boolean)
    : paragraphs;

  const content: PlacePremiumContent = {
    // Datos reales: no existe marca de demostración.
    demoNotice: "",
    slug: dto.slug,
    destinationSlug: dto.destination.slug,
    breadcrumbs: buildPlaceBreadcrumbs(dto),
    identity: {
      eyebrow: typeLabel,
      title: dto.name,
      subtitle: dto.shortDescription?.trim() || "",
      typeLabel,
      destinationLabel: dto.destination.name,
      regionLabel: dto.regionLabel,
      badges: dto.categories.map((c) => c.name),
    },
    hero: {
      cover: toSurfaceMedia(cover, placeholderLabel),
      supporting,
      primaryCta: { label: "Agregar a Mi Viaje" },
      secondaryCta: { label: "Cómo llegar", href: "#mapa-lugar" },
    },
    intro: {
      kicker: "La historia",
      title: dto.officialName?.trim() || dto.name,
      paragraphs: introParagraphs,
      pullQuote: "",
      media: [],
    },
    essentials: {
      kicker: "Lo esencial",
      title: "Datos para tu visita",
      description: "",
      facts,
      recommendations: dto.highlights,
      accessibility: [...dto.accessibility, ...dto.amenities],
    },
    gallery: {
      kicker: "Galería",
      title: "Fotografías del lugar",
      note: galleryItems.length === 0 ? "" : "",
      items: galleryItems,
    },
    map: {
      heading: "Ubicación y cómo llegar",
      center: { lat: dto.latitude ?? 0, lng: dto.longitude ?? 0, zoom: 13 },
      points:
        dto.latitude != null && dto.longitude != null
          ? [
              {
                id: dto.id,
                kind: "destination" as const,
                lat: dto.latitude,
                lng: dto.longitude,
                title: dto.name,
                subtitle: dto.destination.name,
                badge: typeLabel,
              },
            ]
          : [],
      directions: dto.directions?.trim()
        ? dto.directions
            .split(/\n+/u)
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
    },
    services: dto.amenities.map((label) => ({ key: label, label, hint: "" })),
    experiences: dto.products.map((item) => ({
      id: item.id,
      title: item.title,
      eyebrow: item.eyebrow,
      description: item.description,
      media: toSurfaceMedia(item.media, `Fotografía pendiente · ${item.title}`),
    })),
    events: dto.events.map((item) => ({
      id: item.id,
      title: item.title,
      eyebrow: item.eyebrow,
      description: item.description,
      media: toSurfaceMedia(item.media, `Fotografía pendiente · ${item.title}`),
    })),
    // Q2D-B no infiere cercanías: sin fuente gobernada, la sección se oculta.
    nearby: [],
    trip: {
      title: "Agrega este lugar a Mi Viaje",
      description: "Guárdalo en tu itinerario y Alux lo integrará a tu plan del Oriente Maya.",
      actionLabel: "Agregar a Mi Viaje",
    },
    alux: {
      title: "Pregúntale a Alux",
      description:
        "Tu concierge IA te ayuda a decidir cuándo ir, cuánto tiempo dedicar y qué combinar cerca.",
      prompts: [
        `¿Cuándo es mejor visitar ${dto.name}?`,
        `¿Cuánto tiempo necesito en ${dto.name}?`,
        `Combínalo con experiencias y eventos cerca de ${dto.destination.name}`,
      ],
      actionLabel: "Abrir Alux",
    },
  };

  return {
    content,
    variant: variantDef?.slug ?? null,
    resolution,
    presentation: resolution.presentation,
    hasApprovedCover,
    jsonLdType: placeJsonLdType(dto.typeSlug),
    canonicalPath: placeCanonicalPath(dto),
  };
}
