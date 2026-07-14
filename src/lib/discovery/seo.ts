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
}

export interface DiscoveryHead {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
}

export const DISCOVERY_ORIGIN = "https://quehacerenvalladolid.com";

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
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:locale", content: locale },
    { property: "og:site_name", content: SITE.name },
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
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

  const scripts: Array<{ type: string; children: string }> = (jsonLd ?? []).map((obj) => ({
    type: "application/ld+json",
    children: JSON.stringify(obj),
  }));

  return { meta, links, scripts };
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