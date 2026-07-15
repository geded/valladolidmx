import { z } from "zod";

/**
 * MCP · Contratos compartidos (M1.0).
 *
 * Los schemas Zod aquí definidos son la fuente única de verdad para
 * inputs y outputs de todas las tools del servidor MCP de Valladolid.mx.
 *
 * Convenciones:
 *  - Todo campo territorial preserva `latitude` / `longitude` reales.
 *  - Todo resultado incluye `sources[]` (Explainable-by-Default).
 *  - Toda tool acepta `locale` con fallback explícito.
 */

export const SUPPORTED_LOCALES = ["es", "en", "fr", "de", "it", "pt"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LocaleSchema = z
  .enum(SUPPORTED_LOCALES)
  .default("es")
  .describe("Idioma preferido de respuesta (fallback explícito a 'es').");

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const SourceCitationSchema = z.object({
  kind: z.enum([
    "catalog",
    "cms",
    "events",
    "destinations",
    "traveler_profile",
    "travel_plans",
  ]),
  table: z.string().optional(),
  slug: z.string().optional(),
  id: z.string().optional(),
  freshness_hint: z
    .string()
    .optional()
    .describe("Ej. 'updated_at:2026-07-01', 'live'."),
});
export type SourceCitation = z.infer<typeof SourceCitationSchema>;

export const ExplainSchema = z.object({
  rationale: z.string(),
  sources: z.array(SourceCitationSchema),
  limitations: z.array(z.string()).optional(),
  locale_used: z.enum(SUPPORTED_LOCALES),
  locale_fallback: z.boolean().optional(),
});
export type ExplainBlock = z.infer<typeof ExplainSchema>;
