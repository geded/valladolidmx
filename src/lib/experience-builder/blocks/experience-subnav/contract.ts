/**
 * H-03 · Ola I1.b — `vmx.experience.subnav`
 *
 * Capa 2 (Contenido). Sub-nav horizontal, sticky, con anclas
 * declaradas (o auto-detectadas por el wrapper). Reutilizable en
 * TODAS las Experience Pages (business, product, event, destination,
 * region, landing, micrositio, hotel, restaurante, experiencia…).
 *
 * Regla de Compatibilidad Evolutiva:
 *   - Nunca se creará `experience.subnav-pro` ni `-v2`.
 *   - Toda evolución vive en `variant` / `capabilities` / `extensions[]`.
 */
import { z } from "zod";

export const EXPERIENCE_SUBNAV_CONTRACT_VERSION = "1.0.0";

export const experienceSubnavVariantSchema = z.enum([
  "pill",   // Chips redondeados (default).
  "tabs",   // Tabs con underline activo.
  "underline", // Enlaces con línea inferior (editorial).
]);
export type ExperienceSubnavVariant = z.infer<typeof experienceSubnavVariantSchema>;

export const experienceSubnavSourceSchema = z.enum([
  "manual",      // Anclas definidas explícitamente en config.
  "auto",        // Wrapper detecta secciones con `data-eb-anchor` en la página.
  "business",    // Presets curados para ficha empresa.
  "product",     // Reservado.
  "destination", // Reservado.
  "event",       // Reservado.
]);
export type ExperienceSubnavSource = z.infer<typeof experienceSubnavSourceSchema>;

export const experienceSubnavAnchorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  iconKey: z.string().optional(),
});
export type ExperienceSubnavAnchor = z.infer<typeof experienceSubnavAnchorSchema>;

export const experienceSubnavConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_SUBNAV_CONTRACT_VERSION),
  source: experienceSubnavSourceSchema.default("manual"),
  variant: experienceSubnavVariantSchema.default("pill"),
  sticky: z.boolean().default(true),
  /** Offset (px) para el scroll a anclas, respeta headers globales. */
  scrollOffset: z.number().min(0).max(400).default(80),
  anchors: z.array(experienceSubnavAnchorSchema).default([]),
  /** Etiqueta accesible del <nav>. */
  ariaLabel: z.string().default("Secciones de la página"),
  capabilities: z
    .object({
      scrollSpy: z.boolean().default(true),
      collapseOnMobile: z.boolean().default(true),
      showIcons: z.boolean().default(false),
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
export type ExperienceSubnavConfig = z.infer<typeof experienceSubnavConfigSchema>;

export const experienceSubnavDtoSchema = z.object({
  variant: experienceSubnavVariantSchema,
  sticky: z.boolean(),
  scrollOffset: z.number(),
  ariaLabel: z.string(),
  anchors: z.array(experienceSubnavAnchorSchema),
  capabilities: z.object({
    scrollSpy: z.boolean(),
    collapseOnMobile: z.boolean(),
    showIcons: z.boolean(),
  }),
});
export type ExperienceSubnavDTO = z.infer<typeof experienceSubnavDtoSchema>;

export function buildExperienceSubnavPreviewDTO(): ExperienceSubnavDTO {
  return {
    variant: "pill",
    sticky: true,
    scrollOffset: 80,
    ariaLabel: "Secciones de la página",
    anchors: [
      { id: "resumen", label: "Resumen" },
      { id: "galeria", label: "Galería" },
      { id: "servicios", label: "Servicios" },
      { id: "resenas", label: "Reseñas" },
      { id: "ubicacion", label: "Ubicación" },
    ],
    capabilities: {
      scrollSpy: true,
      collapseOnMobile: true,
      showIcons: false,
    },
  };
}

/** Presets curados por tipo de superficie (Regla Evolutiva: mismo bloque). */
export const EXPERIENCE_SUBNAV_PRESETS: Record<
  Exclude<ExperienceSubnavSource, "manual" | "auto">,
  ExperienceSubnavAnchor[]
> = {
  business: [
    { id: "resumen", label: "Resumen" },
    { id: "galeria", label: "Galería" },
    { id: "servicios", label: "Servicios" },
    { id: "promociones", label: "Promociones" },
    { id: "resenas", label: "Reseñas" },
    { id: "ubicacion", label: "Ubicación" },
    { id: "contacto", label: "Contacto" },
  ],
  product: [
    { id: "resumen", label: "Resumen" },
    { id: "galeria", label: "Galería" },
    { id: "detalles", label: "Detalles" },
    { id: "resenas", label: "Reseñas" },
    { id: "relacionados", label: "Relacionados" },
  ],
  destination: [
    { id: "resumen", label: "Resumen" },
    { id: "que-hacer", label: "Qué hacer" },
    { id: "donde-comer", label: "Dónde comer" },
    { id: "donde-dormir", label: "Dónde dormir" },
    { id: "como-llegar", label: "Cómo llegar" },
  ],
  event: [
    { id: "resumen", label: "Resumen" },
    { id: "programa", label: "Programa" },
    { id: "sede", label: "Sede" },
    { id: "entradas", label: "Entradas" },
  ],
};