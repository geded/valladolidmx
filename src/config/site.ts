/**
 * site.ts — Configuración global del sitio (Fase 0).
 */

export const SITE = {
  name: "Valladolid.mx",
  tagline: "Oriente Maya de Yucatán",
  domain: "quehacerenvalladolid.com",
  url: "https://quehacerenvalladolid.com",
  default_description:
    "Despierta en Valladolid y descubre el Oriente Maya: cenotes, cultura, gastronomía y experiencias auténticas de Yucatán.",
  theme_color: "#EAA840",
  // SEO.A1.2 · D1 — Imagen social oficial estable (1200×630).
  // URL absoluta pública, sin autenticación, sin query strings.
  og_image: "https://quehacerenvalladolid.com/og/default-1200x630.jpg",
} as const;
