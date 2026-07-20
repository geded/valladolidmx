/**
 * site.ts — Configuración global del sitio.
 *
 * PR-1 · Canonical Core Consolidation:
 * Este archivo es la ÚNICA fuente de verdad del dominio público del
 * ecosistema Valladolid.mx / Oriente Maya. Todo helper público
 * (SEO, JSON-LD, canonical, OpenGraph, Twitter, breadcrumbs,
 * Experience Builder, emails transaccionales, media, sitemap, etc.)
 * DEBE derivar su origen de `SITE.url` o del helper `absoluteUrl()`.
 *
 * Migración futura a `https://valladolid.mx`: cambiar únicamente
 * `PUBLIC_DOMAIN` y `PUBLIC_URL` a continuación. Ninguna otra edición
 * es necesaria en el código de aplicación (los ficheros estáticos
 * `robots.txt`, `sitemap.xml`, `llms.txt` y la allow-list HMAC se
 * migran en PRs posteriores).
 */

/** Dominio público canónico (host, sin protocolo). */
const PUBLIC_DOMAIN = "quehacerenvalladolid.com";
/** URL pública canónica (con protocolo, sin trailing slash). */
const PUBLIC_URL = `https://${PUBLIC_DOMAIN}` as const;

/**
 * Absolutiza un path público contra el dominio canónico.
 * - Acepta paths con o sin `/` inicial.
 * - Devuelve la URL sin normalizar query/hash (paso-through).
 * - Si `path` ya es absoluto (http/https), lo devuelve tal cual.
 */
export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_URL}${normalized}`;
}

export const SITE = {
  name: "Valladolid.mx",
  tagline: "Oriente Maya de Yucatán",
  domain: PUBLIC_DOMAIN,
  url: PUBLIC_URL,
  default_description:
    "Despierta en Valladolid y descubre el Oriente Maya: cenotes, cultura, gastronomía y experiencias auténticas de Yucatán.",
  theme_color: "#EAA840",
  // SEO.A1.2 · D1 — Imagen social oficial estable (1200×630).
  // Derivada de `SITE.url` para preservar la fuente única de verdad.
  og_image: absoluteUrl("/og/default-1200x630.jpg"),
} as const;