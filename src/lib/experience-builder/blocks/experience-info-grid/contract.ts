/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid`
 *
 * Capa 2 (Contenido). Rejilla de datos clave (horario, dirección,
 * precio, categoría, aforo…). Único bloque oficial de datos rápidos.
 * Evolución sólo por `variant` / `capabilities` / `extensions[]`.
 *
 * I4-A/B/C · Governed Source Reconciliation (18.51):
 *  - La NUEVA autoría admite exclusivamente el binding canónico
 *    `geography.location`. `source: "manual"` y los `items` escritos
 *    por el cliente quedan prohibidos para autoría nueva.
 *  - Las configuraciones legacy existentes se conservan únicamente
 *    como render histórico congelado: sin edición, sin duplicación,
 *    sin reutilización, sin plantilla y sin nueva autoría.
 *  - Sin fuente gobernada válida el bloque falla en cerrado; nunca
 *    inventa datos.
 */
import { z } from "zod";

export const EXPERIENCE_INFO_GRID_CONTRACT_VERSION = "1.0.0";

/** Único binding gobernado admitido para autoría nueva (18.51). */
export const EXPERIENCE_INFO_GRID_CANONICAL_SOURCE = "geography.location" as const;
export type ExperienceInfoGridCanonicalSource = typeof EXPERIENCE_INFO_GRID_CANONICAL_SOURCE;

export const experienceInfoGridVariantSchema = z.enum([
  "cards", // Cada dato en una tarjeta (default).
  "list", // Lista compacta con separadores.
  "inline", // Fila horizontal (chips).
]);

/**
 * Enum histórico. Se conserva SÓLO para poder parsear y renderizar
 * composiciones legacy ya persistidas. No es autoría admitida.
 */
export const experienceInfoGridSourceSchema = z.enum([
  "geography.location",
  "manual",
  "business",
  "product",
  "destination",
  "event",
]);

/** Autoría nueva: literal canónico, sin alternativas. */
export const experienceInfoGridAuthoringSourceSchema = z.literal(
  EXPERIENCE_INFO_GRID_CANONICAL_SOURCE,
);

export const experienceInfoItemSchema = z.object({
  iconKey: z.string().optional(),
  label: z.string().min(1),
  value: z.string().min(1),
  href: z.string().optional(),
  tone: z.enum(["default", "primary", "accent", "warning"]).default("default"),
});
export type ExperienceInfoItem = z.infer<typeof experienceInfoItemSchema>;

/** Procedencia del dato renderizado. Sólo `published` es gobernada. */
export const experienceInfoGridProvenanceSchema = z.enum([
  "published",
  "legacy_frozen",
  "demo",
  "unavailable",
]);
export type ExperienceInfoGridProvenance = z.infer<typeof experienceInfoGridProvenanceSchema>;

export const experienceInfoGridConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_INFO_GRID_CONTRACT_VERSION),
  source: experienceInfoGridSourceSchema.default(EXPERIENCE_INFO_GRID_CANONICAL_SOURCE),
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

/**
 * Esquema de AUTORÍA NUEVA. Sólo binding canónico y sin `items`
 * escritos por el cliente.
 */
export const experienceInfoGridAuthoringConfigSchema = experienceInfoGridConfigSchema.extend({
  source: experienceInfoGridAuthoringSourceSchema,
  items: z.array(experienceInfoItemSchema).max(0).default([]),
});

/**
 * `true` cuando la configuración corresponde a la forma legacy
 * (fuente distinta de la canónica o `items` escritos manualmente).
 */
export function isLegacyExperienceInfoGridConfig(config: unknown): boolean {
  if (!config || typeof config !== "object") return true;
  const record = config as Record<string, unknown>;
  const items = record.items;
  if (Array.isArray(items) && items.length > 0) return true;
  return record.source !== EXPERIENCE_INFO_GRID_CANONICAL_SOURCE;
}

export const experienceInfoGridDtoSchema = z.object({
  variant: experienceInfoGridVariantSchema,
  heading: z.string().nullable(),
  columns: z.number(),
  items: z.array(experienceInfoItemSchema),
  ariaLabel: z.string(),
  provenance: experienceInfoGridProvenanceSchema.optional(),
  capabilities: z.object({
    copyable: z.boolean(),
    livePricing: z.boolean(),
    liveAvailability: z.boolean(),
  }),
});
export type ExperienceInfoGridDTO = z.infer<typeof experienceInfoGridDtoSchema>;

/** Fuente gobernada `geography.location` publicada. */
export interface GovernedLocationSource {
  provenance?: "published" | "demo";
  primary_location?: {
    label: string | null;
    address_line1: string | null;
    address_line2: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

/**
 * Proyecta el binding canónico `geography.location` a items. Devuelve
 * `null` cuando la procedencia no es `published` o faltan coordenadas
 * reales — el bloque debe fallar en cerrado, nunca inventar datos.
 */
export function buildGovernedLocationItems(
  source: GovernedLocationSource | null | undefined,
): ExperienceInfoItem[] | null {
  if (!source || source.provenance !== "published") return null;
  const location = source.primary_location;
  if (!location) return null;
  if (typeof location.latitude !== "number" || typeof location.longitude !== "number") return null;
  const address = [location.address_line1, location.address_line2].filter(Boolean).join(", ");
  if (!address) return null;
  const items: ExperienceInfoItem[] = [
    {
      iconKey: "map-pin",
      label: location.label?.trim() || "Ubicación",
      value: address,
      tone: "default",
    },
  ];
  items.push({
    iconKey: "map-pin",
    label: "Coordenadas",
    value: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
    tone: "default",
  });
  return items;
}

/** Preview de biblioteca (paleta del Studio). Nunca alimenta producción. */
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
    provenance: "demo",
    capabilities: {
      copyable: false,
      livePricing: false,
      liveAvailability: false,
    },
  };
}
