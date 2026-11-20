/**
 * Studio Standard v1.0 — Estándar Único de Construcción del CMS.
 *
 * Capa PURA y declarativa. No renderiza, no lee base de datos, no cambia el
 * render público. Reúne en una sola fuente las CINCO declaraciones que toda
 * plantilla oficial debe tener para ser editable con el mismo motor:
 *
 *   1. Secciones          → `composite-sections.ts` (bloques compuestos) o
 *                           `SURFACE_SLOT_REGISTRY` (superficies por región).
 *   2. Campos editables   → `editorial-builder-policy.ts` (autoridad de escritura).
 *   3. Contenido CMS      → `cmsSource` por sección.
 *   4. Señales para Alux  → `aluxIntent` por sección.
 *   5. Espacios comerciales → `commercialSlots` por sección.
 *
 * Fail-closed: una plantilla sin declaración se comporta exactamente como hoy.
 */
import {
  COMPOSITE_SECTION_REGISTRY,
  type CompositeAluxIntent,
  type CompositeCmsSource,
  type CompositeSectionDef,
} from "./composite-sections";

export const STUDIO_STANDARD_VERSION = "1.0.0" as const;

/**
 * Superficies que NO se publican como bloque compuesto sino como una maqueta
 * aprobada única cuyas regiones se marcan con `data-eb-section`.
 * La landing SEO (`premium-seo-landing`) es la primera familia adoptada.
 */
export interface SurfaceSlotDef {
  /** Clave del slot, idéntica al `data-eb-section` de la superficie. */
  key: string;
  /** Nombre visible para el editor. */
  label: string;
  /** La maqueta aprobada fija la posición de las regiones no reordenables. */
  reorderable?: boolean;
  cmsSource?: CompositeCmsSource;
  aluxIntent?: CompositeAluxIntent;
  commercialSlots?: boolean;
}

export interface SurfaceSlotRegistryEntry {
  /** Ancla lógica del lienzo cuando la maqueta se edita por regiones. */
  canvasId: string;
  /** Clave de configuración donde la superficie guarda su orden editable. */
  orderKey: string;
  slots: readonly SurfaceSlotDef[];
}

/** Familia landing SEO: maqueta aprobada editada región por región. */
export const SEO_LANDING_SURFACE_KEY = "premium-seo-landing" as const;

export const SURFACE_SLOT_REGISTRY: Record<string, SurfaceSlotRegistryEntry> = {
  [SEO_LANDING_SURFACE_KEY]: {
    canvasId: "__seo_landing_surface__",
    orderKey: "order",
    slots: [
      { key: "hero", label: "Portada", aluxIntent: "orientarse" },
      { key: "badges", label: "Señales de confianza" },
      {
        key: "intro",
        label: "Por qué es extraordinario",
        reorderable: true,
        cmsSource: "editorial",
        aluxIntent: "descubrir-destino",
      },
      {
        key: "offers",
        label: "Experiencias destacadas",
        reorderable: true,
        cmsSource: "products",
        aluxIntent: "elegir-experiencia",
        commercialSlots: true,
      },
      {
        key: "infoGrid",
        label: "Información para tu visita",
        reorderable: true,
        cmsSource: "editorial",
        aluxIntent: "orientarse",
      },
      {
        key: "map",
        label: "Contexto territorial",
        reorderable: true,
        aluxIntent: "ubicarse",
      },
      { key: "aluxPlanner", label: "Alux", aluxIntent: "conversar" },
      { key: "gallery", label: "Galería" },
    ],
  },
};

export function getSurfaceSlots(surfaceKey: string): SurfaceSlotRegistryEntry | null {
  return SURFACE_SLOT_REGISTRY[surfaceKey] ?? null;
}

/** Etiquetas visibles por slot, para el lienzo y el panel Estructura. */
export function surfaceSlotLabels(surfaceKey: string): Record<string, string> {
  const entry = getSurfaceSlots(surfaceKey);
  if (!entry) return {};
  return Object.fromEntries(entry.slots.map((slot) => [slot.key, slot.label]));
}

/** Slots que admiten arrastrar y pegar, en el orden aprobado. */
export function surfaceReorderableSlots(surfaceKey: string): readonly string[] {
  const entry = getSurfaceSlots(surfaceKey);
  if (!entry) return [];
  return entry.slots.filter((slot) => slot.reorderable).map((slot) => slot.key);
}

/* ------------------------------------------------------------------ */
/* Rutas públicas por familia de plantilla (declarativo, sin red)      */
/* ------------------------------------------------------------------ */

/**
 * Familia de plantilla que gobierna cada ruta pública ya existente. No crea
 * rutas ni cambia el render: sólo permite que Alux sepa qué intenciones de
 * viaje declara la superficie que el explorador está mirando.
 */
export const SURFACE_ROUTE_TEMPLATES: readonly {
  readonly test: (pathname: string) => boolean;
  readonly templateKey: string;
}[] = [
  { test: (p) => p === "/" , templateKey: "vmx.home.premium-g4" },
  {
    test: (p) => /^\/oriente-maya\/[^/]+\/?$/.test(p) && !p.startsWith("/oriente-maya/destinos"),
    templateKey: "vmx.destination.premium-g4",
  },
  { test: (p) => /^\/(?:oriente-maya\/[^/]+\/)?lugares\/[^/]+\/?$/.test(p), templateKey: "vmx.place.premium-q2d" },
  {
    test: (p) =>
      /^\/(hoteles|restaurantes|casas-de-vacaciones|experiencias|lugares|que-hacer)\/?$/.test(p) ||
      /^\/oriente-maya\/[^/]+\/[^/]+\/?$/.test(p),
    templateKey: "vmx.listing.premium-g5",
  },
];

/** Plantilla declarada para una ruta pública, o `null` si no hay declaración. */
export function templateKeyForPath(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? pathname;
  return SURFACE_ROUTE_TEMPLATES.find((entry) => entry.test(path))?.templateKey ?? null;
}

/** Intenciones de viaje declaradas por la plantilla, sin repetir y en orden. */
export function aluxIntentsForTemplate(templateKey: string | null): readonly CompositeAluxIntent[] {
  if (!templateKey) return [];
  const seen = new Set<CompositeAluxIntent>();
  for (const signal of studioSectionSignals(templateKey)) {
    if (signal.aluxIntent) seen.add(signal.aluxIntent);
  }
  return [...seen];
}

/** Slot declarado por el identificador persistido del nodo (`...-hero`). */
export function slotOfNodeId(nodeId: string): string {
  const parts = nodeId.split("-");
  return parts[parts.length - 1] ?? "";
}

/* ------------------------------------------------------------------ */
/* Resolvers transversales (Alux y visibilidad)                        */
/* ------------------------------------------------------------------ */

export interface StudioSectionSignals {
  readonly key: string;
  readonly label: string;
  readonly cmsSource: CompositeCmsSource | null;
  readonly aluxIntent: CompositeAluxIntent | null;
  readonly commercialSlots: boolean;
  readonly reorderable: boolean;
}

function toSignals(def: CompositeSectionDef | SurfaceSlotDef): StudioSectionSignals {
  return {
    key: def.key,
    label: def.label,
    cmsSource: def.cmsSource ?? null,
    aluxIntent: def.aluxIntent ?? null,
    commercialSlots: def.commercialSlots === true,
    reorderable: def.reorderable === true,
  };
}

/**
 * Señales declaradas de una plantilla, sea bloque compuesto o superficie por
 * regiones. Devuelve `[]` cuando la plantilla aún no declara nada.
 */
export function studioSectionSignals(templateKey: string): readonly StudioSectionSignals[] {
  const composite = COMPOSITE_SECTION_REGISTRY[templateKey];
  if (composite) return composite.sections.map(toSignals);
  const surface = SURFACE_SLOT_REGISTRY[templateKey];
  if (surface) return surface.slots.map(toSignals);
  return [];
}

/** Intención de viaje declarada para una sección concreta (Alux). */
export function aluxIntentForSection(
  templateKey: string,
  sectionKey: string,
): CompositeAluxIntent | null {
  return studioSectionSignals(templateKey).find((s) => s.key === sectionKey)?.aluxIntent ?? null;
}

/**
 * Carriles de la plantilla que admiten presencia contratada, en el orden
 * declarado. El reparto real lo resuelve `commercial-slots.ts` con sus reglas
 * aprobadas; aquí sólo se responde qué carriles son elegibles.
 */
export function commercialRailsForTemplate(templateKey: string): readonly string[] {
  return studioSectionSignals(templateKey)
    .filter((s) => s.commercialSlots)
    .map((s) => s.key);
}

/* ------------------------------------------------------------------ */
/* Verificador de cumplimiento                                         */
/* ------------------------------------------------------------------ */

export interface StudioStandardAuditRow {
  readonly templateKey: string;
  readonly kind: "composite" | "surface";
  readonly sections: number;
  readonly reorderableSections: number;
  /** Secciones alimentadas por catálogo CMS declarado. */
  readonly cmsBackedSections: number;
  /** Secciones con intención declarada para Alux. */
  readonly aluxSections: number;
  /** Carriles elegibles para presencia contratada. */
  readonly commercialRails: number;
  /** `true` cuando la plantilla puede editarse y reordenarse con el estándar. */
  readonly editable: boolean;
}

export function auditStudioStandard(): readonly StudioStandardAuditRow[] {
  const rows: StudioStandardAuditRow[] = [];
  for (const [templateKey, entry] of Object.entries(COMPOSITE_SECTION_REGISTRY)) {
    const signals = entry.sections.map(toSignals);
    rows.push(buildRow(templateKey, "composite", signals, Boolean(entry.orderKey)));
  }
  for (const [templateKey, entry] of Object.entries(SURFACE_SLOT_REGISTRY)) {
    const signals = entry.slots.map(toSignals);
    rows.push(buildRow(templateKey, "surface", signals, Boolean(entry.orderKey)));
  }
  return rows;
}

function buildRow(
  templateKey: string,
  kind: "composite" | "surface",
  signals: readonly StudioSectionSignals[],
  hasOrderKey: boolean,
): StudioStandardAuditRow {
  const reorderable = signals.filter((s) => s.reorderable).length;
  return {
    templateKey,
    kind,
    sections: signals.length,
    reorderableSections: reorderable,
    cmsBackedSections: signals.filter((s) => s.cmsSource).length,
    aluxSections: signals.filter((s) => s.aluxIntent).length,
    commercialRails: signals.filter((s) => s.commercialSlots).length,
    editable: signals.length > 0 && (!hasOrderKey || reorderable > 0),
  };
}
