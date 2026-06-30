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

export const DISCOVERY_ORIGIN = "https://valladolidmx.lovable.app";

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