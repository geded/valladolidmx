/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid`
 *
 * Capa 2 (Contenido). Rejilla de datos clave (horario, dirección,
 * precio, categoría, aforo…). Único bloque oficial de datos rápidos.
 * Evolución sólo por `variant` / `capabilities` / `extensions[]`.
 */
import { z } from "zod";

export const EXPERIENCE_INFO_GRID_CONTRACT_VERSION = "1.0.0";

export const experienceInfoGridVariantSchema = z.enum([
  "cards",  // Cada dato en una tarjeta (default).
  "list",   // Lista compacta con separadores.
  "inline", // Fila horizontal (chips).
]);

export const experienceInfoGridSourceSchema = z.enum([
  "manual",
  "business",
  "product",
  "destination",
  "event",
]);

export const experienceInfoItemSchema = z.object({
  iconKey: z.string().optional(),
  label: z.string().min(1),
  value: z.string().min(1),
  href: z.string().optional(),
  tone: z.enum(["default", "primary", "accent", "warning"]).default("default"),
});
export type ExperienceInfoItem = z.infer<typeof experienceInfoItemSchema>;

export const experienceInfoGridConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_INFO_GRID_CONTRACT_VERSION),
  source: experienceInfoGridSourceSchema.default("manual"),
  variant: experienceInfoGridVariantSchema.default("cards"),
  heading: z.string().optional(),
  columns: z.number().min(1).max(4).default(3),
  items: z.array(experienceInfoItemSchema).default([]),
  ariaLabel: z.string().default("Información clave"),
  capabilities: z
    .object({
      copyable: z.boolean().default(false),
      livePricing: z.boolean().default(false),
      liveAvailability: z.boolean().default(false),
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
export type ExperienceInfoGridConfig = z.infer<typeof experienceInfoGridConfigSchema>;

export const experienceInfoGridDtoSchema = z.object({
  variant: experienceInfoGridVariantSchema,
  heading: z.string().nullable(),
  columns: z.number(),
  items: z.array(experienceInfoItemSchema),
  ariaLabel: z.string(),
  capabilities: z.object({
    copyable: z.boolean(),
    livePricing: z.boolean(),
    liveAvailability: z.boolean(),
  }),
});
export type ExperienceInfoGridDTO = z.infer<typeof experienceInfoGridDtoSchema>;

export function buildExperienceInfoGridPreviewDTO(): ExperienceInfoGridDTO {
  return {
    variant: "cards",
    heading: "Información clave",
    columns: 3,
    items: [
      { iconKey: "map-pin", label: "Ubicación", value: "Centro, Valladolid", tone: "default" },
      { iconKey: "clock", label: "Horario", value: "10:00 – 22:00", tone: "default" },
      { iconKey: "phone", label: "Teléfono", value: "+52 985 000 0000", tone: "primary" },
      { iconKey: "tag", label: "Categoría", value: "Restaurante", tone: "default" },
      { iconKey: "star", label: "Rating", value: "4.8 / 5.0", tone: "accent" },
      { iconKey: "users", label: "Aforo", value: "80 personas", tone: "default" },
    ],
    ariaLabel: "Información clave",
    capabilities: {
      copyable: false,
      livePricing: false,
      liveAvailability: false,
    },
  };
}