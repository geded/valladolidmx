/**
 * G8-E · Fast Track de Plantillas Premium Aprobadas — registro único.
 *
 * Autoridad declarativa de los presets productivos del Experience Builder.
 * Cada preset apunta a una plantilla compuesta ya aprobada visualmente y a
 * su autoridad de render; el constructor no debe crear composiciones
 * premium fuera de este registro (Single Studio Principle).
 *
 * Reglas:
 *  - Orden y layout bloqueados por el preset; el contenido es editable.
 *  - Sin duplicación de bloques: cada plantilla evoluciona por `config` y
 *    `variant` (Evolutionary Compatibility Rule).
 *  - Este módulo es puro: sin red, sin base de datos, sin flags.
 */
import { homePremiumG4DefaultConfig } from "@/components/home-premium/home-premium-config";
import { listingPremiumG5DefaultConfig } from "@/components/listing-premium/listing-premium-config";
import type { EditorialSurface } from "./editorial-builder-policy";
import type { PageKind } from "./page-kind-registry";

export const PREMIUM_TEMPLATE_REGISTRY_VERSION = "1.0.0" as const;
export const PREMIUM_TEMPLATE_EFFECTIVE_DATE = "2026-08-26" as const;

export interface PremiumTemplatePreset {
  /** Identificador estable del preset (slug del borrador sugerido). */
  id: string;
  /** Nombre visible en la galería del constructor. */
  name: string;
  /** Descripción corta orientada al editor, no al ingeniero. */
  description: string;
  /** Bloque compuesto que renderiza el preset. */
  blockType: string;
  /** Variante aprobada única. */
  variant: string;
  /** Superficie editorial en la que el preset es insertable. */
  surface: EditorialSurface;
  /** Familia de plantilla (agrupa la galería). */
  family: "home" | "destination" | "listing";
  /** Ruta pública objetivo del preset (informativa). */
  targetRoute: string;
  /** Vista interna que actúa como autoridad visual aprobada. */
  visualAuthorityRoute: string;
  /** Versión del contrato compuesto. */
  contractVersion: string;
  /** Estado editorial del preset dentro del Fast Track. */
  status: "aprobada";
  /**
   * Tipos de página compatibles (fail-closed): un preset sólo puede
   * seleccionarse cuando el `pageKind` destino está declarado aquí.
   */
  pageKinds: readonly PageKind[];
  /** Configuración inicial del bloque al crear la composición. */
  defaultConfig: () => Record<string, unknown>;
}

/** Tipos de página compatibles por familia de plantilla premium. */
const PAGE_KINDS_BY_FAMILY: Record<"home" | "destination" | "listing", readonly PageKind[]> = {
  home: ["home"],
  destination: ["destination"],
  listing: ["landing", "campaign"],
};

export const PREMIUM_TEMPLATE_PRESETS: PremiumTemplatePreset[] = [
  {
    id: "premium-g4-approved",
    name: "Home Premium G4",
    description:
      "Página principal aprobada: hero editorial, categorías bordadas, Alux, destinos, rutas, experiencias, hospedaje, eventos, historias, mapa y cierre de viaje.",
    blockType: "vmx.home.premium-g4",
    variant: "premium-g4-approved",
    surface: "home",
    family: "home",
    targetRoute: "/",
    visualAuthorityRoute: "/lovable/g4-home-premium-preview",
    contractVersion: "1.0.0",
    status: "aprobada",
    pageKinds: PAGE_KINDS_BY_FAMILY.home,
    defaultConfig: () => homePremiumG4DefaultConfig(),
  },
  {
    id: "destino-premium-g4-approved",
    name: "Micrositio de Destino G4",
    description:
      "Micrositio de destino aprobado: hero, categorías bordadas, Descubre, galería editorial, vista de servicio, mapa oficial y destinos cercanos.",
    blockType: "vmx.destination.premium-g4",
    variant: "destino-premium-g4-approved",
    surface: "destination",
    family: "destination",
    targetRoute: "/oriente-maya/valladolid",
    visualAuthorityRoute: "/lovable/g4-destination-microsite-preview",
    contractVersion: "1.0.0",
    status: "aprobada",
    pageKinds: PAGE_KINDS_BY_FAMILY.destination,
    defaultConfig: () => ({}),
  },
  ...(
    [
      ["hoteles", "Hoteles", "/hoteles"],
      ["restaurantes", "Restaurantes", "/restaurantes"],
      ["experiencias", "Experiencias", "/experiencias"],
      ["eventos", "Eventos", "/eventos"],
      ["casas-de-vacaciones", "Casas de vacaciones", "/casas-de-vacaciones"],
      ["que-hacer", "Qué hacer", "/que-hacer"],
    ] as const
  ).map(([family, label, route]) => ({
    id: `listado-${family}-premium-g5-approved`,
    name: `Listado ${label} G5`,
    description: `Listado turístico aprobado de ${label.toLowerCase()}: hero cinematográfico, facetas, tarjetas turísticas y contexto territorial.`,
    blockType: "vmx.listing.premium-g5",
    variant: "listado-premium-g5-approved",
    surface: "landing" as EditorialSurface,
    family: "listing" as const,
    targetRoute: route,
    visualAuthorityRoute: "/lovable/g5-listing-readiness-preview",
    contractVersion: "1.0.0",
    status: "aprobada" as const,
    pageKinds: PAGE_KINDS_BY_FAMILY.listing,
    defaultConfig: () => listingPremiumG5DefaultConfig(family) as Record<string, unknown>,
  })),
];

/**
 * Tipos de página compatibles (fail-closed). Un preset no declarado para el
 * `pageKind` destino NUNCA es seleccionable.
 */
export function isPremiumPresetCompatible(presetId: string, pageKind: string): boolean {
  const preset = getPremiumTemplatePreset(presetId);
  if (!preset) return false;
  return preset.pageKinds.some((k) => k === pageKind);
}

/** Presets seleccionables para un tipo de página. Desconocido → lista vacía. */
export function listPremiumTemplatePresetsForKind(pageKind: string): PremiumTemplatePreset[] {
  return PREMIUM_TEMPLATE_PRESETS.filter((p) => p.pageKinds.some((k) => k === pageKind));
}

/**
 * Miniatura del preset derivada de su propia configuración aprobada
 * (portada del hero). Sin construcción de URLs ni derivaciones locales.
 */
export function resolvePremiumPresetThumbnail(preset: PremiumTemplatePreset): string | null {
  const cfg = preset.defaultConfig() as Record<string, unknown>;
  const direct = cfg.hero_media_url;
  if (typeof direct === "string" && direct.trim()) return direct;
  const slides = cfg.hero_slides;
  if (Array.isArray(slides)) {
    for (const slide of slides) {
      const url = (slide as Record<string, unknown> | null)?.media_url;
      if (typeof url === "string" && url.trim()) return url;
    }
  }
  return null;
}

export function getPremiumTemplatePreset(id: string): PremiumTemplatePreset | null {
  return PREMIUM_TEMPLATE_PRESETS.find((p) => p.id === id) ?? null;
}

export function listPremiumTemplatePresets(surface?: EditorialSurface): PremiumTemplatePreset[] {
  if (!surface) return PREMIUM_TEMPLATE_PRESETS;
  return PREMIUM_TEMPLATE_PRESETS.filter((p) => p.surface === surface);
}
