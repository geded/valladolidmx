/**
 * G8-R1-L · Paso L1 — Plantilla reusable `premium-seo-landing`.
 *
 * Autoridad visual acreditada: composición `biz-zazil-tunich`, revisión #2
 * (`SEO.A3.M2`), SHA-256 `61913a4fa92bdb1c671a392caabc0b08f55a6ec946ed737abcd9038e01113d9c`.
 * De esa autoridad se extrae EXCLUSIVAMENTE la estructura narrativa de 17
 * bloques y sus variantes; el contenido específico de Zazil Tunich NO se
 * copia: todos los slots nacen neutrales y se llenan con datos reales.
 *
 * Módulo PURO: sin red, sin base de datos, sin React, sin flags.
 * Reglas: cero contenido inventado (slot vacío ⇒ bloque omitido),
 * cero publicación, cero migración de esquema (el metadato editorial vive
 * en `chrome.seo.landing`, jsonb ya existente).
 */
import { z } from "zod";
import type { CompositionNode, CompositionTree } from "../composition-tree";

export const SEO_LANDING_TEMPLATE_ID = "premium-seo-landing" as const;
export const SEO_LANDING_VARIANT = "authority-editorial-zazil" as const;
export const SEO_LANDING_CONTRACT_VERSION = "1.0.0" as const;
export const SEO_LANDING_AUTHORITY = {
  compositionSlug: "biz-zazil-tunich",
  variantKey: "zazil-tunich",
  revisionLabel: "SEO.A3.M2",
  revisionNumber: 2,
  sha256: "61913a4fa92bdb1c671a392caabc0b08f55a6ec946ed737abcd9038e01113d9c",
} as const;

/* ------------------------------------------------------------------ *
 * Slots de la plantilla (orden narrativo aprobado).
 * ------------------------------------------------------------------ */

export type SeoLandingSlotId =
  | "hero"
  | "subnav"
  | "badges"
  | "intro"
  | "features"
  | "story"
  | "highlight"
  | "practical"
  | "gallery"
  | "offers"
  | "infoGrid"
  | "quote"
  | "map"
  | "related"
  | "reviews"
  | "faq"
  | "ctaBar";

export interface SeoLandingSlotDefinition {
  readonly id: SeoLandingSlotId;
  readonly order: number;
  readonly blockType: string;
  readonly blockVersion: string;
  readonly variant: string | null;
  readonly label: string;
  /** `true` si el bloque se omite cuando el slot no tiene contenido real. */
  readonly omitWhenEmpty: boolean;
}

export const SEO_LANDING_SLOTS: readonly SeoLandingSlotDefinition[] = [
  { id: "hero", order: 1, blockType: "vmx.experience.hero", blockVersion: "1.0.0", variant: "immersive", label: "Portada inmersiva", omitWhenEmpty: false },
  { id: "subnav", order: 2, blockType: "vmx.experience.subnav", blockVersion: "1.0.0", variant: "pill", label: "Navegación interna", omitWhenEmpty: true },
  { id: "badges", order: 3, blockType: "vmx.experience.institutional-badges", blockVersion: "1.0.0", variant: null, label: "Distintivos institucionales", omitWhenEmpty: true },
  { id: "intro", order: 4, blockType: "vmx.experience.section", blockVersion: "1.0.0", variant: "editorial", label: "Por qué visitar", omitWhenEmpty: true },
  { id: "features", order: 5, blockType: "vmx.experience.features", blockVersion: "1.0.0", variant: "grid", label: "Lo que distingue", omitWhenEmpty: true },
  { id: "story", order: 6, blockType: "vmx.experience.section", blockVersion: "1.0.0", variant: "split", label: "Relato principal", omitWhenEmpty: true },
  { id: "highlight", order: 7, blockType: "vmx.experience.section", blockVersion: "1.0.0", variant: "editorial", label: "Momento destacado", omitWhenEmpty: true },
  { id: "practical", order: 8, blockType: "vmx.experience.section", blockVersion: "1.0.0", variant: "editorial", label: "Sección práctica", omitWhenEmpty: true },
  { id: "gallery", order: 9, blockType: "vmx.experience.gallery", blockVersion: "1.0.0", variant: "mosaic", label: "Galería", omitWhenEmpty: true },
  { id: "offers", order: 10, blockType: "vmx.experience.products", blockVersion: "1.0.0", variant: "grid", label: "Oferta publicada", omitWhenEmpty: true },
  { id: "infoGrid", order: 11, blockType: "vmx.experience.info-grid", blockVersion: "1.0.0", variant: "cards", label: "Información práctica", omitWhenEmpty: true },
  { id: "quote", order: 12, blockType: "vmx.experience.section", blockVersion: "1.0.0", variant: "quote", label: "Cita acreditada", omitWhenEmpty: true },
  { id: "map", order: 13, blockType: "vmx.experience.map", blockVersion: "1.0.0", variant: "single", label: "Ubicación", omitWhenEmpty: true },
  { id: "related", order: 14, blockType: "vmx.experience.related-collection", blockVersion: "1.0.0", variant: "grid", label: "Sigue descubriendo", omitWhenEmpty: true },
  { id: "reviews", order: 15, blockType: "vmx.experience.reviews", blockVersion: "1.0.0", variant: "list", label: "Reseñas", omitWhenEmpty: true },
  { id: "faq", order: 16, blockType: "vmx.experience.faq", blockVersion: "1.0.0", variant: "accordion", label: "Preguntas frecuentes", omitWhenEmpty: true },
  { id: "ctaBar", order: 17, blockType: "vmx.experience.cta-bar", blockVersion: "1.0.0", variant: "floating", label: "Barra de conversión", omitWhenEmpty: true },
];

export const SEO_LANDING_BLOCK_COUNT = SEO_LANDING_SLOTS.length;

/* ------------------------------------------------------------------ *
 * Metadatos editoriales (chrome.seo.landing) — sin migración.
 * ------------------------------------------------------------------ */

export const seoLandingChromeSchema = z.object({
  template: z.literal(SEO_LANDING_TEMPLATE_ID),
  variant: z.literal(SEO_LANDING_VARIANT),
  contractVersion: z.string().min(1),
  /** Entidad real de origen: `business:<id>`, `place:<id>`, ... */
  entityRef: z.string().min(1),
  /**
   * Presentación persistible. Para `premium-seo-landing` la ÚNICA autoridad
   * visual acreditada es `authority-editorial-zazil`, por lo que "editorial"
   * es el modo aprobado y predeterminado. "cinematic" permanece fail-closed:
   * se acepta como valor histórico pero se normaliza a "editorial" hasta que
   * exista una aprobación visual Founder independiente.
   */
  presentation: z
    .enum(["editorial", "cinematic"])
    .default("editorial")
    .transform(() => "editorial" as const),
  /** Slots efectivamente poblados con datos reales. */
  populatedSlots: z.array(z.string()).default([]),
  authority: z
    .object({
      compositionSlug: z.string(),
      revisionLabel: z.string(),
      sha256: z.string(),
    })
    .optional(),
});
export type SeoLandingChrome = z.infer<typeof seoLandingChromeSchema>;

/* ------------------------------------------------------------------ *
 * Construcción de la composición neutral.
 * ------------------------------------------------------------------ */

export type SeoLandingSlotConfig = Record<string, unknown>;

export interface BuildSeoLandingInput {
  /** Config real por slot. Un slot ausente o vacío se omite. */
  readonly slots: Partial<Record<SeoLandingSlotId, SeoLandingSlotConfig | null>>;
  readonly entityRef: string;
  readonly presentation?: "editorial" | "cinematic";
  /** Prefijo de ids de nodo (determinista, sin aleatoriedad). */
  readonly idPrefix?: string;
}

function hasContent(config: SeoLandingSlotConfig | null | undefined): boolean {
  if (!config) return false;
  return Object.values(config).some((value) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

/**
 * Construye la composición de 17 bloques a partir de slots reales.
 * Determinista y sin contenido inventado: los slots vacíos (salvo `hero`)
 * no generan nodo.
 */
export function buildSeoLandingComposition(input: BuildSeoLandingInput): CompositionTree {
  const prefix = input.idPrefix ?? "seo-landing";
  const populated: string[] = [];
  const children: CompositionNode[] = [];

  for (const slot of SEO_LANDING_SLOTS) {
    const config = input.slots[slot.id] ?? null;
    const filled = hasContent(config);
    if (!filled && slot.omitWhenEmpty) continue;
    if (filled) populated.push(slot.id);
    children.push({
      id: `${prefix}-${slot.id}`,
      type: slot.blockType,
      version: slot.blockVersion,
      config: {
        ...(slot.variant ? { variant: slot.variant } : {}),
        ...(config ?? {}),
      },
    });
  }

  const chrome: SeoLandingChrome = {
    template: SEO_LANDING_TEMPLATE_ID,
    variant: SEO_LANDING_VARIANT,
    contractVersion: SEO_LANDING_CONTRACT_VERSION,
    entityRef: input.entityRef,
    // Fail-closed: sólo Editorial está acreditada para esta familia.
    presentation: "editorial",
    populatedSlots: populated,
    authority: {
      compositionSlug: SEO_LANDING_AUTHORITY.compositionSlug,
      revisionLabel: SEO_LANDING_AUTHORITY.revisionLabel,
      sha256: SEO_LANDING_AUTHORITY.sha256,
    },
  };

  return {
    root: { children },
    chrome: { seo: { landing: chrome as unknown as Record<string, never> } as never },
  };
}

/** Lee el metadato editorial de una composición existente (fail-closed). */
export function readSeoLandingChrome(tree: CompositionTree | null): SeoLandingChrome | null {
  const raw = (tree?.chrome?.seo as { landing?: unknown } | undefined)?.landing;
  if (!raw) return null;
  const parsed = seoLandingChromeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
