/**
 * H-03 · Ola I1.c — `vmx.experience.features`
 *
 * Capa 2 (Contenido). Lista de características / servicios / amenities.
 * Único bloque oficial de features; jamás se creará `-pro` ni `-v2`.
 * Evolución sólo por `variant` / `capabilities` / `extensions[]`.
 */
import { z } from "zod";

export const EXPERIENCE_FEATURES_CONTRACT_VERSION = "1.0.0";

export const experienceFeaturesVariantSchema = z.enum([
  "grid",     // Grid de tarjetas con icono + título + descripción.
  "checklist", // Lista con checks (amenities).
  "chips",    // Chips compactos (amenities cortos).
  "columns",  // Dos columnas editorial.
]);

export const experienceFeaturesSourceSchema = z.enum([
  "manual",
  "business",
  "product",
  "destination",
  "event",
]);

export const experienceFeatureItemSchema = z.object({
  iconKey: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  available: z.boolean().default(true),
  href: z.string().optional(),
});
export type ExperienceFeatureItem = z.infer<typeof experienceFeatureItemSchema>;

export const experienceFeaturesConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_FEATURES_CONTRACT_VERSION),
  source: experienceFeaturesSourceSchema.default("manual"),
  variant: experienceFeaturesVariantSchema.default("grid"),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  columns: z.number().min(1).max(4).default(3),
  items: z.array(experienceFeatureItemSchema).default([]),
  ariaLabel: z.string().default("Características"),
  capabilities: z
    .object({
      groupByCategory: z.boolean().default(false),
      showUnavailable: z.boolean().default(true),
      compact: z.boolean().default(false),
    })
    .partial()
    .default({}),
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperienceFeaturesConfig = z.infer<typeof experienceFeaturesConfigSchema>;

export const experienceFeaturesDtoSchema = z.object({
  variant: experienceFeaturesVariantSchema,
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  columns: z.number(),
  items: z.array(experienceFeatureItemSchema),
  ariaLabel: z.string(),
  capabilities: z.object({
    groupByCategory: z.boolean(),
    showUnavailable: z.boolean(),
    compact: z.boolean(),
  }),
});
export type ExperienceFeaturesDTO = z.infer<typeof experienceFeaturesDtoSchema>;

export function buildExperienceFeaturesPreviewDTO(): ExperienceFeaturesDTO {
  return {
    variant: "grid",
    heading: "Lo que incluye",
    subheading: null,
    columns: 3,
    items: [
      { iconKey: "wifi", title: "Wi-Fi de alta velocidad", description: "En todo el recinto", available: true },
      { iconKey: "utensils", title: "Desayuno incluido", description: "Cocina yucateca", available: true },
      { iconKey: "car", title: "Estacionamiento", description: "Gratuito y vigilado", available: true },
      { iconKey: "waves", title: "Alberca", description: "Abierta 7:00 – 22:00", available: true },
      { iconKey: "leaf", title: "Jardín botánico", description: "Recorrido guiado", available: true },
      { iconKey: "accessibility", title: "Accesibilidad", description: "Rampas y baños adaptados", available: true },
    ],
    ariaLabel: "Características",
    capabilities: {
      groupByCategory: false,
      showUnavailable: true,
      compact: false,
    },
  };
}