/**
 * U-VISUAL · V4 — `vmx.experience.map` (Founder Discovery Map Principle)
 *
 * C2.F1 Piloto (Render-Only Block Contracts). Split-file, single-source:
 *  - `types.ts`     → tipos canónicos (fuente única). Sin Zod.
 *  - `defaults.ts`  → defaults + `applyExperienceMapDefaults()`. Sin Zod.
 *  - `contract.ts`  → schemas Zod para Studio/CMS/server (validación
 *                     runtime en la ruta de ESCRITURA). Re-exporta los
 *                     tipos y defaults canónicos.
 *
 * Equivalencia enforced por:
 *  - `satisfies z.ZodType<T>` (compile-time) sobre `experienceMapDTOSchema`.
 *  - Fixtures en `scripts/experience-map-defaults.test.ts` (runtime).
 *
 * Regla de Compatibilidad Evolutiva: este bloque crece sólo por
 * `variant`, `capabilities`, `permissions` y `extensions[]`. Prohibido
 * `-pro`, `-v2`, `-cluster` o duplicar schemas/defaults.
 */
import { z } from "zod";
import type {
  ExperienceMapCapabilities,
  ExperienceMapCenter,
  ExperienceMapDTO,
  ExperienceMapEntityKind,
  ExperienceMapPoint,
  ExperienceMapVariant,
} from "./types";
import {
  EXPERIENCE_MAP_DEFAULT_CAPABILITIES,
  EXPERIENCE_MAP_DEFAULT_CENTER_ZOOM,
  EXPERIENCE_MAP_DEFAULT_VARIANT,
} from "./defaults";

// Re-exports: fuente única para todos los consumidores.
export type {
  ExperienceMapCapabilities,
  ExperienceMapCenter,
  ExperienceMapDTO,
  ExperienceMapEntityKind,
  ExperienceMapPoint,
  ExperienceMapVariant,
} from "./types";
export {
  EXPERIENCE_MAP_CONTRACT_VERSION,
} from "./types";
export {
  EXPERIENCE_MAP_DEFAULT_CAPABILITIES,
  EXPERIENCE_MAP_DEFAULT_VARIANT,
  applyExperienceMapDefaults,
} from "./defaults";

export const experienceMapVariantSchema = z.enum([
  "single",
  "multi",
  "list-sync",
  "cluster",
]) satisfies z.ZodType<ExperienceMapVariant>;

export const experienceMapEntityKindSchema = z.enum([
  "business",
  "product",
  "destination",
  "event",
  "promotion",
]) satisfies z.ZodType<ExperienceMapEntityKind>;

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
}) satisfies z.ZodType<ExperienceMapPoint>;

export const experienceMapCapabilitiesSchema = z.object({
  showDistance: z.boolean().default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.showDistance),
  showDirections: z.boolean().default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.showDirections),
  clustering: z.boolean().default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.clustering),
  syncList: z.boolean().default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.syncList),
  staticFallback: z.boolean().default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.staticFallback),
  allowInteractiveToggle: z
    .boolean()
    .default(EXPERIENCE_MAP_DEFAULT_CAPABILITIES.allowInteractiveToggle),
});

export const experienceMapCenterSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  zoom: z.number().default(EXPERIENCE_MAP_DEFAULT_CENTER_ZOOM),
}) satisfies z.ZodType<ExperienceMapCenter>;

export const experienceMapDTOSchema = z.object({
  variant: experienceMapVariantSchema.default(EXPERIENCE_MAP_DEFAULT_VARIANT),
  heading: z.string().nullable().optional(),
  center: experienceMapCenterSchema.nullable().optional(),
  points: z.array(experienceMapPointSchema).default([]),
  capabilities: experienceMapCapabilitiesSchema.default({
    ...EXPERIENCE_MAP_DEFAULT_CAPABILITIES,
  }),
  emptyMessage: z.string().nullable().optional(),
});
