/**
 * H-03 · Ola I1.c — `vmx.experience.gallery`
 *
 * Capa 2 (Contenido). Galería de medios reutilizable en todas las
 * Experience Pages. Único bloque de galería oficial de la Biblioteca;
 * jamás se creará `-pro`, `-v2` ni duplicados.
 *
 * Evolución (Regla de Compatibilidad Evolutiva):
 *   - imágenes (v1)              → `items[].kind: "image"`
 *   - video (capability)         → `items[].kind: "video"` + `capabilities.video`
 *   - 360° / 3D / AR / UGC (fut) → `capabilities.*` opt-in
 *   - lightbox / zoom / captions → `capabilities.*` sin romper contrato
 */
import { z } from "zod";

export const EXPERIENCE_GALLERY_CONTRACT_VERSION = "1.0.0";

export const experienceGalleryVariantSchema = z.enum([
  "mosaic", // Grid asimétrico editorial (default).
  "grid",   // Grid uniforme.
  "carousel", // Carrusel horizontal snap.
  "strip",  // Tira compacta (usable dentro de secciones).
]);
export type ExperienceGalleryVariant = z.infer<typeof experienceGalleryVariantSchema>;

export const experienceGallerySourceSchema = z.enum([
  "manual",
  "business",
  "product",
  "destination",
  "event",
]);
export type ExperienceGallerySource = z.infer<typeof experienceGallerySourceSchema>;

export const experienceGalleryItemSchema = z.object({
  kind: z.enum(["image", "video"]).default("image"),
  url: z.string().min(1),
  alt: z.string().default(""),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type ExperienceGalleryItem = z.infer<typeof experienceGalleryItemSchema>;

export const experienceGalleryConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_GALLERY_CONTRACT_VERSION),
  source: experienceGallerySourceSchema.default("manual"),
  variant: experienceGalleryVariantSchema.default("mosaic"),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  items: z.array(experienceGalleryItemSchema).default([]),
  maxVisible: z.number().min(1).max(24).default(9),
  aspect: z.enum(["landscape", "square", "portrait", "auto"]).default("landscape"),
  ariaLabel: z.string().default("Galería"),
  capabilities: z
    .object({
      lightbox: z.boolean().default(true),
      captions: z.boolean().default(true),
      video: z.boolean().default(false),
      panorama360: z.boolean().default(false),
      model3d: z.boolean().default(false),
      ar: z.boolean().default(false),
      ugc: z.boolean().default(false),
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
export type ExperienceGalleryConfig = z.infer<typeof experienceGalleryConfigSchema>;

export const experienceGalleryDtoSchema = z.object({
  variant: experienceGalleryVariantSchema,
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  items: z.array(experienceGalleryItemSchema),
  maxVisible: z.number(),
  aspect: z.enum(["landscape", "square", "portrait", "auto"]),
  ariaLabel: z.string(),
  capabilities: z.object({
    lightbox: z.boolean(),
    captions: z.boolean(),
    video: z.boolean(),
    panorama360: z.boolean(),
    model3d: z.boolean(),
    ar: z.boolean(),
    ugc: z.boolean(),
  }),
});
export type ExperienceGalleryDTO = z.infer<typeof experienceGalleryDtoSchema>;

export function buildExperienceGalleryPreviewDTO(): ExperienceGalleryDTO {
  const stock = (id: string) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
  return {
    variant: "mosaic",
    heading: "Galería",
    subheading: null,
    items: [
      { kind: "image", url: stock("1502134249126-9f3755a50d78"), alt: "Cenote" },
      { kind: "image", url: stock("1476514525535-07fb3b4ae5f1"), alt: "Selva" },
      { kind: "image", url: stock("1526779259212-939e64788e3c"), alt: "Playa" },
      { kind: "image", url: stock("1519821172144-4f87d85de2a4"), alt: "Ruinas" },
      { kind: "image", url: stock("1533105079780-92b9be482077"), alt: "Mercado" },
      { kind: "image", url: stock("1544551763-46a013bb70d5"), alt: "Hacienda" },
    ],
    maxVisible: 6,
    aspect: "landscape",
    ariaLabel: "Galería",
    capabilities: {
      lightbox: true,
      captions: true,
      video: false,
      panorama360: false,
      model3d: false,
      ar: false,
      ugc: false,
    },
  };
}