/**
 * H-03 · Ola I1.b — `vmx.experience.cta-bar`
 *
 * Capa 2 (Contenido). Barra de acción persistente. Mobile-first:
 * bottom sticky en móvil, top/bottom sticky en desktop. Reutilizable
 * en TODAS las Experience Pages.
 *
 * Regla de Compatibilidad Evolutiva: única evolución vía
 * `variant` / `capabilities` / `extensions[]`. Nunca `-pro` ni `-v2`.
 */
import { z } from "zod";

export const EXPERIENCE_CTA_BAR_CONTRACT_VERSION = "1.0.0";

export const experienceCtaBarVariantSchema = z.enum([
  "floating",  // Píldora flotante (mobile bottom, desktop bottom-right).
  "bar",       // Barra full-width sticky (mobile bottom, desktop bottom).
  "inline",    // Bar inline (no sticky) — para colocar dentro de secciones.
]);
export type ExperienceCtaBarVariant = z.infer<typeof experienceCtaBarVariantSchema>;

export const experienceCtaBarSourceSchema = z.enum([
  "manual",
  "business",
  "product",
  "event",
  "destination",
]);
export type ExperienceCtaBarSource = z.infer<typeof experienceCtaBarSourceSchema>;

export const experienceCtaBarActionSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).optional(),
  iconKey: z.string().optional(),
  action: z
    .enum(["navigate", "favorite", "contact", "book", "share", "phone", "whatsapp"])
    .default("navigate"),
  emphasis: z.enum(["primary", "secondary", "ghost"]).default("secondary"),
});
export type ExperienceCtaBarAction = z.infer<typeof experienceCtaBarActionSchema>;

export const experienceCtaBarConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_CTA_BAR_CONTRACT_VERSION),
  source: experienceCtaBarSourceSchema.default("manual"),
  variant: experienceCtaBarVariantSchema.default("bar"),
  /** Título opcional (ej. nombre de la ficha o precio). */
  label: z.string().optional(),
  /** Subtítulo opcional (ej. "desde $1,200 MXN · 2 personas"). */
  meta: z.string().optional(),
  actions: z.array(experienceCtaBarActionSchema).min(0).max(4).default([]),
  /** Aparece tras cruzar el offset (px) de scroll. 0 = siempre visible. */
  revealAfterScroll: z.number().min(0).max(2000).default(320),
  /** Posición vertical en desktop. */
  desktopPosition: z.enum(["bottom", "top"]).default("bottom"),
  ariaLabel: z.string().default("Acciones principales"),
  capabilities: z
    .object({
      hideOnScrollDown: z.boolean().default(false),
      showPriceBadge: z.boolean().default(false),
      showFavorite: z.boolean().default(false),
      showShare: z.boolean().default(false),
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
export type ExperienceCtaBarConfig = z.infer<typeof experienceCtaBarConfigSchema>;

export const experienceCtaBarDtoSchema = z.object({
  variant: experienceCtaBarVariantSchema,
  label: z.string().nullable(),
  meta: z.string().nullable(),
  actions: z.array(experienceCtaBarActionSchema),
  revealAfterScroll: z.number(),
  desktopPosition: z.enum(["bottom", "top"]),
  ariaLabel: z.string(),
  capabilities: z.object({
    hideOnScrollDown: z.boolean(),
    showPriceBadge: z.boolean(),
    showFavorite: z.boolean(),
    showShare: z.boolean(),
  }),
});
export type ExperienceCtaBarDTO = z.infer<typeof experienceCtaBarDtoSchema>;

export function buildExperienceCtaBarPreviewDTO(): ExperienceCtaBarDTO {
  return {
    variant: "bar",
    label: "Hacienda Selva Maya",
    meta: "Desde $2,400 MXN · noche",
    actions: [
      { label: "Reservar", action: "book", href: "#", emphasis: "primary", iconKey: "calendar" },
      { label: "Contactar", action: "contact", href: "#", emphasis: "secondary", iconKey: "message-circle" },
      { label: "Guardar", action: "favorite", href: "#", emphasis: "ghost", iconKey: "heart" },
    ],
    revealAfterScroll: 0,
    desktopPosition: "bottom",
    ariaLabel: "Acciones principales",
    capabilities: {
      hideOnScrollDown: false,
      showPriceBadge: true,
      showFavorite: true,
      showShare: false,
    },
  };
}