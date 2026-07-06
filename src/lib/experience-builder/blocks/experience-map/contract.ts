/**
 * U-VISUAL · V4 — `vmx.experience.map` (Founder Discovery Map Principle)
 *
 * Única familia oficial de mapas. Regla de Compatibilidad Evolutiva:
 * este bloque crece sólo por `variant`, `capabilities`, `permissions` y
 * `extensions[]`. No se crearán `experience.map-pro`, `-v2`, `-cluster`.
 *
 * Variantes:
 *  - single    → un punto (ficha empresa/producto).
 *  - multi     → varios puntos (destino, "qué hay cerca").
 *  - list-sync → mapa sincronizado con grid + facets (TourismListing).
 *  - cluster   → territorial con agrupación (futuro).
 */
import { z } from "zod";

export const EXPERIENCE_MAP_CONTRACT_VERSION = "1.0.0";

export const experienceMapVariantSchema = z.enum([
  "single",
  "multi",
  "list-sync",
  "cluster",
]);
export type ExperienceMapVariant = z.infer<typeof experienceMapVariantSchema>;

export const experienceMapEntityKindSchema = z.enum([
  "business",
  "product",
  "destination",
  "event",
  "promotion",
]);
export type ExperienceMapEntityKind = z.infer<
  typeof experienceMapEntityKindSchema
>;

export const experienceMapPointSchema = z.object({
  id: z.string().min(1),
  kind: experienceMapEntityKindSchema,
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  href: z.string().min(1).nullable().optional(),
  thumbUrl: z.string().url().nullable().optional(),
  badge: z.string().nullable().optional(),
  priceLabel: z.string().nullable().optional(),
});
export type ExperienceMapPoint = z.infer<typeof experienceMapPointSchema>;

export const experienceMapCapabilitiesSchema = z.object({
  showDistance: z.boolean().default(true),
  showDirections: z.boolean().default(true),
  clustering: z.boolean().default(false),
  syncList: z.boolean().default(false),
  staticFallback: z.boolean().default(true),
  allowInteractiveToggle: z.boolean().default(true),
});
export type ExperienceMapCapabilities = z.infer<
  typeof experienceMapCapabilitiesSchema
>;

export const experienceMapDTOSchema = z.object({
  variant: experienceMapVariantSchema.default("single"),
  heading: z.string().nullable().optional(),
  center: z
    .object({ lat: z.number(), lng: z.number(), zoom: z.number().default(14) })
    .nullable()
    .optional(),
  points: z.array(experienceMapPointSchema).default([]),
  capabilities: experienceMapCapabilitiesSchema.default({
    showDistance: true,
    showDirections: true,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  }),
  emptyMessage: z.string().nullable().optional(),
});
export type ExperienceMapDTO = z.infer<typeof experienceMapDTOSchema>;
