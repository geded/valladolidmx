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

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: truncateDescription(description) },
    { property: "og:title", content: title },
    { property: "og:description", content: truncateDescription(description) },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:locale", content: locale },
    { property: "og:site_name", content: SITE.name },
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: truncateDescription(description) },
  ];

  if (ogImage) {
    meta.push({ property: "og:image", content: ogImage });
    meta.push({ name: "twitter:image", content: ogImage });
  }

  const robotsContent = robots ?? (noindex ? "noindex, nofollow" : undefined);
  if (robotsContent) {
    meta.push({ name: "robots", content: robotsContent });
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
  touristType?: string[];
  keywords?: string[];
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: input.name,
    description: input.description,
    url,
    inLanguage: "es-MX",
  };
  if (input.image) jsonLd.image = input.image;
  if (input.latitude != null && input.longitude != null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }
  if (input.containedIn) {
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
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const type = mapCategoryToLocalBusinessType(input.categorySlug);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
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
  return jsonLd;
}

function mapCategoryToLocalBusinessType(slug?: string): string {
  if (!slug) return "LocalBusiness";
  const s = slug.toLowerCase();
  if (s.includes("hotel") || s.includes("hosped")) return "LodgingBusiness";
  if (s.includes("restaur") || s.includes("gastro")) return "Restaurant";
  if (s.includes("tour") || s.includes("experien")) return "TouristAttraction";
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
  priceAmount?: number | null;
  priceCurrency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  aggregateRating?: { ratingValue: number; reviewCount: number };
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
  };
  if (input.image) jsonLd.image = input.image;
  if (input.sku) jsonLd.sku = input.sku;
  if (input.brandName) {
    jsonLd.brand = { "@type": "Brand", name: input.brandName };
  }
  if (input.priceAmount != null && input.priceAmount > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      price: input.priceAmount,
      priceCurrency: input.priceCurrency ?? "MXN",
      availability: `https://schema.org/${input.availability ?? "InStock"}`,
      url,
    };
  }
  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
    };
  }
  return jsonLd;
}

/**
 * H1 · JSON-LD FAQPage — Preguntas frecuentes de un producto/servicio.
 */
export function faqPageJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * H1 · JSON-LD CollectionPage — Listados territoriales por categoría/destino.
 */
export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: ReadonlyArray<{ name: string; path: string }>;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: "es-MX",
    isPartOf: { "@type": "WebSite", name: SITE.name, url: DISCOVERY_ORIGIN },
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
    isPartOf: { "@type": "WebSite", name: SITE.name, url: DISCOVERY_ORIGIN },
  };
  if (input.image) jsonLd.primaryImageOfPage = { "@type": "ImageObject", url: input.image };
  return jsonLd;
}