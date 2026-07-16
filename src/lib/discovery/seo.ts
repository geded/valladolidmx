/**
 * Discovery SEO — contrato unificado de metadata pública (15.10.5d.1).
 *
 * Helper único para construir `head()` de superficies públicas con
 * SEO/OG consistentes y canonical/og:url self-referenciales.
 */
import { SITE } from "@/config/site";

export type DiscoveryOgType = "website" | "article" | "product" | "place" | "profile";

export interface DiscoveryHeadOptions {
  title: string;
  description: string;
  path: string;
  ogType?: DiscoveryOgType;
  ogImage?: string;
  locale?: string;
  noindex?: boolean;
  /** Override del valor del meta `robots`. Si se omite y `noindex` es true,
   *  se emite "noindex, nofollow"; si no, se omite el tag. */
  robots?: string;
  jsonLd?: ReadonlyArray<Record<string, unknown>>;
  /**
   * H1 · SEO Metadata Sweep — Breadcrumbs semánticos.
   * Cuando se especifican, se emite automáticamente un JSON-LD
   * `BreadcrumbList` adicional (además de cualquier otro `jsonLd`).
   * Los ítems deben venir en orden jerárquico (raíz → hoja).
   */
  breadcrumbs?: ReadonlyArray<{ label: string; path: string }>;
}

export interface DiscoveryHead {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
}

export const DISCOVERY_ORIGIN = "https://quehacerenvalladolid.com";

/**
 * SEO.A1.2 · D1/D2 — Imagen social oficial estable.
 * Fallback aplicado por `buildPublicHead` únicamente en superficies
 * públicas e indexables (`noindex` desactiva el fallback).
 */
export const SITE_DEFAULT_OG_IMAGE =
  "https://quehacerenvalladolid.com/og/default-1200x630.jpg" as const;
export const SITE_DEFAULT_OG_WIDTH = 1200 as const;
export const SITE_DEFAULT_OG_HEIGHT = 630 as const;

/**
 * SEO.A1.1 · PR-1 — Identificadores canónicos de entidades globales.
 * Se usan como `@id` estables para que Google/IA reconcilien la misma
 * entidad a lo largo del grafo semántico del sitio.
 *
 * Nota Founder: SearchAction queda **postponed** hasta que exista una
 * superficie pública, indexable y sin autenticación en `/buscar`.
 */
export const ORG_ID = `${DISCOVERY_ORIGIN}/#organization` as const;
export const WEBSITE_ID = `${DISCOVERY_ORIGIN}/#website` as const;
export const LOGO_ID = `${DISCOVERY_ORIGIN}/#logo` as const;

/**
 * SEO.A1.1 · PR-2 — Identificadores canónicos de entidades territoriales.
 *
 * Genera `@id` estables y absolutos que reutilizan la URL canónica de la
 * entidad + un fragmento tipado. Reglas:
 *  · Nunca inventar host, ruta ni fragmento.
 *  · El fragmento describe el rol semántico (place, business, product),
 *    NO el tipo Schema.org (para no romper si evoluciona el subtipo).
 *  · Se usan como ancla de referencia (containedInPlace, isPartOf) sin
 *    reemitir la entidad completa desde otras páginas.
 */
export function placeId(path: string): string {
  return `${absoluteUrl(path)}#place`;
}
export function businessEntityId(path: string): string {
  return `${absoluteUrl(path)}#business`;
}
export function productEntityId(path: string): string {
  return `${absoluteUrl(path)}#product`;
}
export function collectionId(path: string): string {
  return `${absoluteUrl(path)}#collection`;
}

/** Región raíz — `@id` canónico del Oriente Maya. Referencia territorial global. */
export const ORIENTE_MAYA_PLACE_ID = placeId("/oriente-maya");

function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${DISCOVERY_ORIGIN}${normalized}`;
}

export function buildPublicHead(options: DiscoveryHeadOptions): DiscoveryHead {
  const {
    title,
    description,
    path,
    ogType = "website",
    ogImage,
    locale = "es_MX",
    noindex,
    robots,
    jsonLd,
  } = options;

  const url = absoluteUrl(path);

  // SEO.A1.2 · D2 — Fallback social centralizado.
  // Reglas: absolutizar URLs relativas con DISCOVERY_ORIGIN; aplicar
  // fallback oficial ÚNICAMENTE cuando la superficie es indexable
  // (sin noindex y sin robots="noindex,*"); nunca sobre superficies
  // privadas/técnicas/temporales.
  const robotsExplicit = robots ?? (noindex ? "noindex, nofollow" : undefined);
  const isIndexable = !noindex && !(robotsExplicit?.includes("noindex"));
  const resolvedOgImage = ogImage
    ? absoluteUrl(ogImage)
    : isIndexable
      ? SITE_DEFAULT_OG_IMAGE
      : undefined;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: truncateDescription(description) },
    { property: "og:title", content: title },
    { property: "og:description", content: truncateDescription(description) },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:locale", content: locale },
    { property: "og:site_name", content: SITE.name },
    { name: "twitter:card", content: resolvedOgImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: truncateDescription(description) },
  ];

  if (resolvedOgImage) {
    meta.push({ property: "og:image", content: resolvedOgImage });
    // Cuando se usa el fallback oficial, conocemos dimensiones exactas.
    // Para heros publicados, se emiten los mismos anchos por convención
    // 1200×630 (contrato editorial de portadas OG). Consumidores que
    // requieran otras dimensiones deberán ampliar el contrato.
    meta.push({ property: "og:image:width", content: String(SITE_DEFAULT_OG_WIDTH) });
    meta.push({ property: "og:image:height", content: String(SITE_DEFAULT_OG_HEIGHT) });
    meta.push({ name: "twitter:image", content: resolvedOgImage });
  }

  if (robotsExplicit) {
    meta.push({ name: "robots", content: robotsExplicit });
  }

  const links: Array<Record<string, string>> = [{ rel: "canonical", href: url }];

  const allJsonLd: Record<string, unknown>[] = [];
  if (options.breadcrumbs && options.breadcrumbs.length) {
    allJsonLd.push(breadcrumbListJsonLd(options.breadcrumbs));
  }
  if (jsonLd) allJsonLd.push(...jsonLd);
  const scripts: Array<{ type: string; children: string }> = allJsonLd.map((obj) => ({
    type: "application/ld+json",
    children: JSON.stringify(obj),
  }));

  return { meta, links, scripts };
}

/**
 * H1 · SEO Sweep — Recorta y compacta descripciones para meta tags.
 * Google truncará >160c y motores IA prefieren texto compacto.
 */
export function truncateDescription(input: string, max = 160): string {
  const clean = (input ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 100 ? lastSpace : slice.length)}…`;
}

/**
 * H1 · JSON-LD BreadcrumbList — nutrición semántica para Google Rich
 * Results y motores de IA (ChatGPT, Perplexity, Claude, Gemini).
 */
export function breadcrumbListJsonLd(
  items: ReadonlyArray<{ label: string; path: string }>,
): Record<string, unknown> {
  const lastPath = items.length ? items[items.length - 1].path : "/";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(lastPath)}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * SEO.A1.1 · PR-1 — Organization (fuente única).
 * Emitida una sola vez desde `__root.tsx`. Referenciable por otros
 * nodos vía `{ "@id": ORG_ID }` (publisher, brand, provider…).
 */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.default_description,
    slogan: SITE.tagline,
    logo: {
      "@type": "ImageObject",
      "@id": LOGO_ID,
      url: `${SITE.url}/logo.png`,
      caption: SITE.name,
    },
    image: { "@id": LOGO_ID },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Oriente Maya de Yucatán, México",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Valladolid",
      addressRegion: "Yucatán",
      addressCountry: "MX",
    },
  };
}

/**
 * SEO.A1.1 · PR-1 — WebSite (fuente única).
 * `publisher` referencia Organization por `@id`. `potentialAction`
 * (SearchAction) queda **postponed** hasta contar con búsqueda pública
 * indexable/estable/sin auth — no se emite para evitar señales rotas.
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    description: SITE.default_description,
    inLanguage: "es-MX",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * H1 · JSON-LD TouristDestination — Destino turístico (región o pueblo).
 * Establece relaciones explícitas con la región contenedora.
 */
export function touristDestinationJsonLd(input: {
  name: string;
  description: string;
  path: string;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  containedIn?: { name: string; url?: string };
  /** SEO.A1.1 · PR-2 — Referencia al @id de la entidad territorial padre
   *  (p. ej. la Región Oriente Maya). Cuando se pasa, `containedInPlace`
   *  usa `{ "@id": ... }` en lugar de repetir la entidad completa. */
  containedInId?: string;
  touristType?: string[];
  keywords?: string[];
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": placeId(input.path),
    name: input.name,
    description: input.description,
    url,
    inLanguage: "es-MX",
    isPartOf: { "@id": WEBSITE_ID },
  };
  if (input.image) jsonLd.image = input.image;
  if (input.latitude != null && input.longitude != null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }
  if (input.containedInId) {
    jsonLd.containedInPlace = { "@id": input.containedInId };
  } else if (input.containedIn) {
    jsonLd.containedInPlace = {
      "@type": "TouristDestination",
      name: input.containedIn.name,
      ...(input.containedIn.url ? { url: input.containedIn.url } : {}),
    };
  }
  if (input.touristType?.length) jsonLd.touristType = input.touristType;
  if (input.keywords?.length) jsonLd.keywords = input.keywords.join(", ");
  return jsonLd;
}

/**
 * H1 · JSON-LD LocalBusiness — Empresa/hotel/restaurante.
 */
export function localBusinessJsonLd(input: {
  name: string;
  description: string;
  path: string;
  image?: string;
  telephone?: string;
  email?: string;
  addressLine?: string | null;
  addressLocality?: string;
  latitude?: number | null;
  longitude?: number | null;
  priceRange?: string;
  categorySlug?: string;
  destinationName?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
  areaServed?: string;
  /** SEO.A1.1 · PR-2 — `@id` del destino contenedor. Referencia
   *  territorial: la empresa está dentro del destino, no de la marca. */
  destinationPlaceId?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const type = mapCategoryToLocalBusinessType(input.categorySlug);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": businessEntityId(input.path),
    name: input.name,
    description: input.description,
    url,
    inLanguage: "es-MX",
  };
  if (input.image) jsonLd.image = input.image;
  if (input.telephone) jsonLd.telephone = input.telephone;
  if (input.email) jsonLd.email = input.email;
  jsonLd.address = {
    "@type": "PostalAddress",
    ...(input.addressLine ? { streetAddress: input.addressLine } : {}),
    addressLocality: input.addressLocality ?? input.destinationName ?? "Valladolid",
    addressRegion: "Yucatán",
    addressCountry: "MX",
  };
  if (input.latitude != null && input.longitude != null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }
  if (input.priceRange) jsonLd.priceRange = input.priceRange;
  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
    };
  }
  if (input.areaServed) jsonLd.areaServed = input.areaServed;
  if (input.destinationPlaceId) {
    jsonLd.containedInPlace = { "@id": input.destinationPlaceId };
  }
  // Publisher editorial del contenido (ficha en Valladolid.mx). No es la
  // marca del negocio ni su proveedor operativo — sólo publica la ficha.
  jsonLd.publisher = { "@id": ORG_ID };
  return jsonLd;
}

function mapCategoryToLocalBusinessType(slug?: string): string {
  if (!slug) return "LocalBusiness";
  const s = slug.toLowerCase();
  if (s.includes("hotel") || s.includes("hosped")) return "Hotel";
  if (s.includes("restaur") || s.includes("gastro")) return "Restaurant";
  if (s.includes("cenote") || s.includes("zona-arqueolog") || s.includes("ruinas") || s.includes("atractivo")) return "TouristAttraction";
  if (s.includes("museo")) return "Museum";
  if (s.includes("tour") || s.includes("agencia")) return "TravelAgency";
  if (s.includes("experien")) return "TouristAttraction";
  if (s.includes("spa")) return "HealthAndBeautyBusiness";
  if (s.includes("bar")) return "BarOrPub";
  if (s.includes("cafe") || s.includes("cafeter")) return "CafeOrCoffeeShop";
  if (s.includes("tienda") || s.includes("shop") || s.includes("boutique")) return "Store";
  return "LocalBusiness";
}

/**
 * H1 · JSON-LD Product — Producto/experiencia comercializable.
 * Emite `Offer` con precio cuando está disponible.
 */
export function productJsonLd(input: {
  name: string;
  description: string;
  path: string;
  image?: string;
  sku?: string;
  brandName?: string;
  category?: string;
  priceAmount?: number | null;
  priceCurrency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  aggregateRating?: { ratingValue: number; reviewCount: number };
  /** SEO.A1.1 · PR-2 — `@id` del negocio proveedor (brand real). */
  providerBusinessId?: string;
  /** SEO.A1.1 · PR-3 — Reseñas reales, publicadas y visibles en la
   *  misma página. Ya deben venir filtradas (status=published, no
   *  eliminadas, no moderadas). Nunca inyectar simuladas ni externas
   *  sin licencia. Vacío ⇒ no se emite `review`. */
  reviews?: ReadonlyArray<{
    author: string;
    rating: number;
    title?: string | null;
    body: string;
    publishedAt?: string | null;
    language?: string | null;
  }>;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productEntityId(input.path),
    name: input.name,
    description: input.description,
    url,
  };
  if (input.image) jsonLd.image = input.image;
  if (input.sku) jsonLd.sku = input.sku;
  if (input.category) jsonLd.category = input.category;
  if (input.providerBusinessId) {
    // El negocio operador ES la marca real del producto — no Valladolid.mx.
    jsonLd.brand = { "@id": input.providerBusinessId };
  } else if (input.brandName) {
    jsonLd.brand = { "@type": "Brand", name: input.brandName };
  }
  if (input.priceAmount != null && input.priceAmount > 0) {
    // SEO.A1.1 · PR-3 — Offer sólo con datos reales de venta.
    // `priceValidUntil` NUNCA se inventa; se omite si no hay dato canónico.
    // `seller` referencia al negocio real por `@id` cuando existe.
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      price: input.priceAmount,
      priceCurrency: input.priceCurrency ?? "MXN",
      availability: `https://schema.org/${input.availability ?? "InStock"}`,
      url,
    };
    if (input.providerBusinessId) {
      offer.seller = { "@id": input.providerBusinessId };
    }
    jsonLd.offers = offer;
  }
  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (input.reviews && input.reviews.length > 0) {
    const productId = productEntityId(input.path);
    jsonLd.review = input.reviews.slice(0, 10).map((r) => {
      const node: Record<string, unknown> = {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        author: { "@type": "Person", name: r.author },
        reviewBody: r.body,
        itemReviewed: { "@id": productId },
      };
      if (r.title) node.name = r.title;
      if (r.publishedAt) node.datePublished = r.publishedAt;
      if (r.language) node.inLanguage = r.language;
      return node;
    });
  }
  return jsonLd;
}

/**
 * SEO.A1.1 · PR-3 — JSON-LD Event.
 *
 * Principio "No markup without visible evidence": el evento debe estar
 * publicado, vigente y sus datos visibles en la página. `eventStatus`
 * se emite tal cual lo declara el CMS (default `EventScheduled`); un
 * evento cancelado o reprogramado usa el estado Schema.org que aplique.
 * `location` se emite como `Place` con dirección postal sólo si el CMS
 * proporcionó `venue_name`; nunca se inventa dirección.
 */
export function eventJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  image?: string | null;
  startDate: string;
  endDate?: string | null;
  eventStatus?:
    | "EventScheduled"
    | "EventCancelled"
    | "EventPostponed"
    | "EventRescheduled"
    | "EventMovedOnline";
  eventAttendanceMode?: "Offline" | "Online" | "Mixed";
  venueName?: string | null;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  /** `@id` del destino contenedor (Place). */
  locationPlaceId?: string;
  /** URL externa de compra/registro (si existe). */
  externalUrl?: string | null;
  isFree?: boolean;
  /** Organizador referenciado por `@id` (opcional). */
  organizerId?: string;
  organizerName?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const attendanceMap = {
    Offline: "https://schema.org/OfflineEventAttendanceMode",
    Online: "https://schema.org/OnlineEventAttendanceMode",
    Mixed: "https://schema.org/MixedEventAttendanceMode",
  } as const;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: input.name,
    url,
    startDate: input.startDate,
    eventStatus: `https://schema.org/${input.eventStatus ?? "EventScheduled"}`,
    eventAttendanceMode: attendanceMap[input.eventAttendanceMode ?? "Offline"],
  };
  if (input.description) node.description = input.description;
  if (input.image) node.image = input.image;
  if (input.endDate) node.endDate = input.endDate;

  // Location: preferimos referenciar el destino (Place) por @id cuando
  // exista. Si además hay venue con nombre, lo declaramos como Place
  // anidado. Nunca inventamos dirección.
  if (input.venueName) {
    const place: Record<string, unknown> = {
      "@type": "Place",
      name: input.venueName,
      address: {
        "@type": "PostalAddress",
        addressLocality: input.addressLocality ?? "Valladolid",
        addressRegion: input.addressRegion ?? "Yucatán",
        addressCountry: input.addressCountry ?? "MX",
      },
    };
    if (input.locationPlaceId) place.containedInPlace = { "@id": input.locationPlaceId };
    node.location = place;
  } else if (input.locationPlaceId) {
    node.location = { "@id": input.locationPlaceId };
  }

  // Offers — sólo si hay datos reales (URL externa de compra/registro
  // o entrada gratuita declarada). Nunca inventamos precio.
  if (input.externalUrl || input.isFree) {
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      url: input.externalUrl ?? url,
      availability: "https://schema.org/InStock",
    };
    if (input.isFree) {
      offer.price = 0;
      offer.priceCurrency = "MXN";
    }
    node.offers = offer;
  }

  if (input.organizerId) {
    node.organizer = { "@id": input.organizerId };
  } else if (input.organizerName) {
    node.organizer = { "@type": "Organization", name: input.organizerName };
  }
  return node;
}

/**
 * H1 · JSON-LD FAQPage — Preguntas frecuentes de un producto/servicio.
 */
export function faqPageJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
  options?: { path?: string; mainEntityId?: string },
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  if (options?.path) node["@id"] = `${absoluteUrl(options.path)}#faq`;
  // SEO.A1.1 · PR-3 — Reconciliar la FAQ con la entidad principal de la
  // página (Product/Event/…) por `@id` cuando se conoce, para que Google
  // e IA asocien las preguntas a la entidad correcta.
  if (options?.mainEntityId) node.about = { "@id": options.mainEntityId };
  return node;
}

/**
 * H1 · JSON-LD CollectionPage — Listados territoriales por categoría/destino.
 */
export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: ReadonlyArray<{ name: string; path: string }>;
  /** SEO.A1.1 · PR-2 — `@id` del lugar del que trata el listado. */
  aboutPlaceId?: string;
}): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": collectionId(input.path),
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: "es-MX",
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.slice(0, 30).map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: absoluteUrl(it.path),
      })),
    },
  };
  if (input.aboutPlaceId) jsonLd.about = { "@id": input.aboutPlaceId };
  return jsonLd;
}

/**
 * Recorre una composición publicada y devuelve la primera URL de imagen
 * "compartible" que encuentre (hero, portada, media, image, background).
 * Sirve como fallback de `og:image` cuando el editor no capturó una en el
 * bloque SEO. Nunca lanza — si no encuentra nada devuelve `undefined`.
 */
export function pickFirstMediaUrl(tree: unknown): string | undefined {
  const IMG_KEYS = new Set([
    "og_image", "ogImage",
    "image", "image_url", "imageUrl",
    "media", "media_url", "mediaUrl",
    "cover", "cover_url", "coverUrl",
    "hero", "hero_url", "heroUrl",
    "background", "background_url", "backgroundUrl",
    "src", "url", "poster",
  ]);
  const seen = new WeakSet<object>();
  const stack: unknown[] = [tree];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (seen.has(cur as object)) continue;
    seen.add(cur as object);
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
      continue;
    }
    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (typeof v === "string" && IMG_KEYS.has(k) && looksLikeImage(v)) {
        return v;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}

/**
 * Recorre el árbol de composición y devuelve el primer nodo cuyo `type`
 * comience con `vmx.smart.` — utilidad para hidratar OG image desde la
 * primera imagen resuelta por un Smart Block cuando el editor no dejó
 * `og_image` explícito ni imágenes estáticas en la página (15.10.8.5).
 */
export function findFirstSmartBlockNode(tree: unknown): { type: string; config: Record<string, unknown> } | undefined {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [tree];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur as object)) continue;
    seen.add(cur as object);
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
      continue;
    }
    const obj = cur as Record<string, unknown>;
    const type = obj.type;
    if (typeof type === "string" && type.startsWith("vmx.smart.")) {
      return { type, config: (obj.config as Record<string, unknown>) ?? {} };
    }
    for (const v of Object.values(obj)) if (v && typeof v === "object") stack.push(v);
  }
  return undefined;
}

function looksLikeImage(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/")) {
    return /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(v) || /supabase|cloudinary|images|storage|cdn/i.test(v);
  }
  return false;
}

/** JSON-LD mínimo (WebPage) para páginas del Studio; útil para snippets. */
export function webPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url,
    inLanguage: "es-MX",
    // Housekeeping SEO.A1.1 · PR-2 — reconciliar con WebSite canónico.
    isPartOf: { "@id": WEBSITE_ID },
  };
  if (input.image) {
    // Housekeeping SEO.A1.1 · PR-2 — absolutizar URL de imagen principal.
    jsonLd.primaryImageOfPage = { "@type": "ImageObject", url: absoluteUrl(input.image) };
  }
  return jsonLd;
}