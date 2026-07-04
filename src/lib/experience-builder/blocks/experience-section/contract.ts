/**
 * H-03 · Ola I1.c — `vmx.experience.section`
 *
 * Capa 2 (Contenido). Sección editorial avanzada con eyebrow, título,
 * lead, cuerpo enriquecido, media opcional y hasta 2 CTAs. Reemplaza
 * evolutivamente al viejo `vmx.layout.section` cuando se necesite
 * jerarquía editorial. Ambos coexisten (compatibilidad).
 */
import { z } from "zod";

export const EXPERIENCE_SECTION_CONTRACT_VERSION = "1.0.0";

export const experienceSectionVariantSchema = z.enum([
  "editorial", // Título grande + lead + cuerpo (default).
  "split",     // Texto a la izquierda, media a la derecha.
  "centered",  // Título centrado + subtítulo + CTA.
  "quote",     // Cita destacada con atribución.
]);

export const experienceSectionSourceSchema = z.enum([
  "manual",
  "business",
  "product",
  "destination",
  "event",
]);

export const experienceSectionCtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  emphasis: z.enum(["primary", "secondary", "ghost", "link"]).default("primary"),
  iconKey: z.string().optional(),
});
export type ExperienceSectionCTA = z.infer<typeof experienceSectionCtaSchema>;

export const experienceSectionConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_SECTION_CONTRACT_VERSION),
  source: experienceSectionSourceSchema.default("manual"),
  variant: experienceSectionVariantSchema.default("editorial"),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  lead: z.string().optional(),
  body: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaAlt: z.string().optional(),
  attribution: z.string().optional(),
  ctas: z.array(experienceSectionCtaSchema).max(2).default([]),
  align: z.enum(["left", "center"]).default("left"),
  tone: z.enum(["default", "muted", "accent"]).default("default"),
  ariaLabel: z.string().optional(),
  capabilities: z
    .object({
      anchor: z.boolean().default(true),
      seoHeading: z.boolean().default(true),
      richText: z.boolean().default(false),
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
export type ExperienceSectionConfig = z.infer<typeof experienceSectionConfigSchema>;

export const experienceSectionDtoSchema = z.object({
  variant: experienceSectionVariantSchema,
  eyebrow: z.string().nullable(),
  title: z.string().nullable(),
  lead: z.string().nullable(),
  body: z.string().nullable(),
  media: z
    .object({ url: z.string(), alt: z.string() })
    .nullable(),
  attribution: z.string().nullable(),
  ctas: z.array(experienceSectionCtaSchema),
  align: z.enum(["left", "center"]),
  tone: z.enum(["default", "muted", "accent"]),
  ariaLabel: z.string().nullable(),
  capabilities: z.object({
    anchor: z.boolean(),
    seoHeading: z.boolean(),
    richText: z.boolean(),
  }),
});
export type ExperienceSectionDTO = z.infer<typeof experienceSectionDtoSchema>;

export function buildExperienceSectionPreviewDTO(): ExperienceSectionDTO {
  return {
    variant: "editorial",
    eyebrow: "Sobre este lugar",
    title: "Una hacienda que respira historia",
    lead: "Cinco siglos de tradición yucateca conviven con una experiencia contemporánea diseñada para viajeros curiosos.",
    body: "Recorridos guiados, jardines botánicos, gastronomía maya de autor y espacios íntimos para eventos. Cada rincón mantiene los materiales originales y la vocación cultural que la vio nacer.",
    media: null,
    attribution: null,
    ctas: [
      { label: "Reservar visita", href: "#reservar", emphasis: "primary" },
      { label: "Ver programa", href: "#programa", emphasis: "link" },
    ],
    align: "left",
    tone: "default",
    ariaLabel: "Sobre este lugar",
    capabilities: { anchor: true, seoHeading: true, richText: false },
  };
}