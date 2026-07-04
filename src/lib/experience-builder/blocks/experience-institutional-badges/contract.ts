/**
 * H-03 · Ola I3.c — `vmx.experience.institutional-badges` (Capa 2: Contenido).
 *
 * Contrato Zod único para todos los distintivos institucionales.
 * Evolución sólo por `variant` / `size` / `capabilities` / `extensions[]`.
 */
import { z } from "zod";
import { BADGE_KINDS } from "./institutional-badges.registry";

export const EXPERIENCE_BADGES_CONTRACT_VERSION = "1.0.0";

export const badgeKindSchema = z.enum(BADGE_KINDS);

export const badgeVariantSchema = z.enum(["filled", "soft", "outline", "icon-only"]);
export const badgeSizeSchema = z.enum(["sm", "md", "lg"]);
export const badgeLayoutSchema = z.enum(["strip", "stack"]);
export const badgeSourceSchema = z.enum([
  "manual",
  "destination",
  "business",
  "product",
  "event",
]);

export const institutionalBadgeItemSchema = z.object({
  kind: badgeKindSchema,
  slug: z.string().min(1),
  label: z.string().optional(),
  shortLabel: z.string().optional(),
  programUrl: z.string().url().optional(),
  issuedAt: z.string().optional(),
  source: badgeSourceSchema.default("manual"),
});
export type InstitutionalBadgeItem = z.infer<typeof institutionalBadgeItemSchema>;

export const experienceBadgesConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_BADGES_CONTRACT_VERSION),
  source: badgeSourceSchema.default("manual"),
  variant: badgeVariantSchema.default("soft"),
  size: badgeSizeSchema.default("md"),
  layout: badgeLayoutSchema.default("strip"),
  /**
   * Slug del sujeto (destino, empresa, producto…). Se usa para autorizar
   * badges restringidos (p. ej. `pueblo-magico` en Valladolid, Izamal, Espita).
   */
  subjectSlug: z.string().optional(),
  items: z.array(institutionalBadgeItemSchema).default([]),
  ariaLabel: z.string().default("Distintivos institucionales"),
  capabilities: z
    .object({
      showLabel: z.boolean().default(true),
      showTooltip: z.boolean().default(true),
      compact: z.boolean().default(false),
      monochrome: z.boolean().default(false),
      linkToProgram: z.boolean().default(false),
      /** Máx. visible en móvil antes de colapsar a `+N` (default 3). */
      mobileVisibleMax: z.number().int().min(1).max(6).default(3),
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
export type ExperienceBadgesConfig = z.infer<typeof experienceBadgesConfigSchema>;

export const experienceBadgesDtoSchema = z.object({
  variant: badgeVariantSchema,
  size: badgeSizeSchema,
  layout: badgeLayoutSchema,
  items: z.array(institutionalBadgeItemSchema),
  ariaLabel: z.string(),
  capabilities: z.object({
    showLabel: z.boolean(),
    showTooltip: z.boolean(),
    compact: z.boolean(),
    monochrome: z.boolean(),
    linkToProgram: z.boolean(),
    mobileVisibleMax: z.number(),
  }),
});
export type ExperienceBadgesDTO = z.infer<typeof experienceBadgesDtoSchema>;

export function buildExperienceBadgesPreviewDTO(): ExperienceBadgesDTO {
  return {
    variant: "soft",
    size: "md",
    layout: "strip",
    ariaLabel: "Distintivos institucionales",
    capabilities: {
      showLabel: true,
      showTooltip: true,
      compact: false,
      monochrome: false,
      linkToProgram: false,
      mobileVisibleMax: 3,
    },
    items: [
      { kind: "pueblo-magico", slug: "pueblo-magico:valladolid", source: "destination" },
      { kind: "patrimonio", slug: "patrimonio:centro-historico", source: "destination" },
      { kind: "oriente-maya", slug: "oriente-maya:yucatan", source: "destination" },
      { kind: "despierta-en-valladolid", slug: "despierta:programa", source: "destination" },
      { kind: "verified-business", slug: "verified:valladolid-mx", source: "business" },
    ],
  };
}