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
 * Administrable (Configuración → Dominios): el dominio canónico ya no
 * está fijo en código. `DEFAULT_PUBLIC_DOMAIN` es únicamente el valor
 * predeterminado y el fallback seguro; la autoridad vigente es el ajuste
 * `site.primary_domain` en `platform_settings`, aplicado en tiempo de
 * ejecución con `setCanonicalDomain()`. Los ficheros estáticos
 * (`robots.txt`, `sitemap.xml`, `llms.txt`) derivan del mismo helper.
 */

import { ACTIVE_BRAND } from "@/config/brand";

/** Dominio público canónico predeterminado (host, sin protocolo). */
export const DEFAULT_PUBLIC_DOMAIN = "quehacerenvalladolid.com";

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** Normaliza un host administrado. Devuelve null si no es válido. */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
  if (!host || host.length > 253) return null;
  return DOMAIN_RE.test(host) ? host : null;
}

let runtimeDomain: string | null = null;

/** Aplica el dominio canónico administrado. Ignora valores inválidos. */
export function setCanonicalDomain(domain: unknown): void {
  const normalized = normalizeDomain(domain);
  if (normalized) runtimeDomain = normalized;
}

/** Dominio canónico vigente (administrado o predeterminado). */
export function getCanonicalDomain(): string {
  return runtimeDomain ?? DEFAULT_PUBLIC_DOMAIN;
}

/** Origen canónico vigente (con protocolo, sin trailing slash). */
export function getCanonicalOrigin(): string {
  return `https://${getCanonicalDomain()}`;
}

/**
 * Absolutiza un path público contra el dominio canónico.
 * - Acepta paths con o sin `/` inicial.
 * - Devuelve la URL sin normalizar query/hash (paso-through).
 * - Si `path` ya es absoluto (http/https), lo devuelve tal cual.
 */
export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getCanonicalOrigin()}${normalized}`;
}

export interface SiteConfig {
  readonly name: string;
  readonly tagline: string;
  readonly domain: string;
  readonly url: string;
  readonly default_description: string;
  readonly theme_color: string;
  readonly og_image: string;
}

export const SITE: SiteConfig = {
  name: ACTIVE_BRAND.name,
  tagline: ACTIVE_BRAND.tagline,
  get domain() {
    return getCanonicalDomain();
  },
  get url() {
    return getCanonicalOrigin();
  },
  default_description:
    "Despierta en Valladolid y descubre el Oriente Maya: cenotes, cultura, gastronomía y experiencias auténticas de Yucatán.",
  theme_color: "#EAA840",
  // SEO.A1.2 · D1 — Imagen social oficial estable (1200×630).
  // Derivada del origen canónico vigente para preservar la fuente única.
  get og_image() {
    return absoluteUrl("/og/default-1200x630.jpg");
  },
};
