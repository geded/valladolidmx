/**
 * Estructura Oficial de Plantillas del Experience Builder.
 *
 * Vista declarativa y PURA que ordena en familias las plantillas ya
 * aprobadas. NO declara plantillas nuevas: deriva todo de los registros
 * existentes (`premium-template-registry`, `entity-premium-templates`,
 * `seo-landing-template`). Sin red, sin base de datos, sin React.
 *
 * Reglas:
 *  - Fuente única: si una plantilla no está en los registros aprobados,
 *    no aparece aquí (fail-closed).
 *  - El orden de familias es estable y editorial, no alfabético.
 *  - `workingSlug` apunta a la página de trabajo del CMS donde se editan
 *    textos, imágenes, enlaces y orden de secciones.
 */
import { PREMIUM_TEMPLATE_PRESETS } from "./premium-template-registry";
import { ENTITY_PREMIUM_TEMPLATE_PRESETS } from "./entity-premium-templates";
import { SEO_LANDING_TEMPLATE_ID } from "./seo-landing/seo-landing-template";
import type { CompositionTree } from "./composition-tree";

export const OFFICIAL_TEMPLATE_STRUCTURE_VERSION = "1.0.0" as const;

export type OfficialTemplateFamilyKey =
  | "inicio"
  | "destinos"
  | "listados"
  | "lugares"
  | "fichas"
  | "landing";

export interface OfficialTemplateEntry {
  /** Identificador estable del preset aprobado. */
  readonly id: string;
  /** Nombre visible para el editor. */
  readonly name: string;
  /** Para qué sirve, en lenguaje turístico. */
  readonly description: string;
  /** Ruta pública de ejemplo. */
  readonly publicRoute: string;
  /** Tipo de página del CMS al que pertenece. */
  readonly pageKind: string;
  /**
   * Página de trabajo donde se editan sus contenidos. `null` cuando la
   * plantilla se aplica automáticamente a fichas publicadas y no tiene
   * una única página editable.
   */
  readonly workingSlug: string | null;
  /** Permite crear la página de trabajo si todavía no existe. */
  readonly creatable: boolean;
}

export interface OfficialTemplateFamily {
  readonly key: OfficialTemplateFamilyKey;
  readonly label: string;
  readonly purpose: string;
  readonly entries: readonly OfficialTemplateEntry[];
}

/** Página de trabajo por preset de listado turístico. */
const LISTING_WORKING_SLUG: Record<string, string> = {
  "listado-hoteles-premium-g5-approved": "hoteles",
  "listado-restaurantes-premium-g5-approved": "restaurantes",
  "listado-experiencias-premium-g5-approved": "experiencias",
  "listado-eventos-premium-g5-approved": "eventos",
  "listado-casas-de-vacaciones-premium-g5-approved": "casas-de-vacaciones",
  "listado-que-hacer-premium-g5-approved": "que-hacer",
};

/** Página de trabajo por familia de ficha individual. */
const ENTITY_WORKING_SLUG: Record<string, string> = {
  business: "__tpl_business__",
  product: "__tpl_product__",
  event: "__tpl_event__",
};

function premiumByFamily(family: "home" | "destination" | "listing" | "place") {
  return PREMIUM_TEMPLATE_PRESETS.filter((p) => p.family === family);
}

export function buildOfficialTemplateStructure(): readonly OfficialTemplateFamily[] {
  const home = premiumByFamily("home").map<OfficialTemplateEntry>((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    publicRoute: p.targetRoute,
    pageKind: "home",
    workingSlug: "home",
    creatable: false,
  }));

  const destinos = premiumByFamily("destination").map<OfficialTemplateEntry>((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    publicRoute: p.targetRoute,
    pageKind: "destination",
    workingSlug: "__tpl_destination__",
    creatable: false,
  }));

  const listados = premiumByFamily("listing").map<OfficialTemplateEntry>((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    publicRoute: p.targetRoute,
    pageKind: "landing",
    workingSlug: LISTING_WORKING_SLUG[p.id] ?? null,
    creatable: Boolean(LISTING_WORKING_SLUG[p.id]),
  }));

  const lugares = premiumByFamily("place").map<OfficialTemplateEntry>((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    publicRoute: p.targetRoute,
    pageKind: "place",
    workingSlug: "__tpl_place__",
    creatable: false,
  }));

  const fichas = ENTITY_PREMIUM_TEMPLATE_PRESETS.map<OfficialTemplateEntry>((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    publicRoute: p.canonicalRoutePattern,
    pageKind: p.entityType,
    workingSlug: ENTITY_WORKING_SLUG[p.entityType] ?? null,
    creatable: false,
  }));

  const landing: OfficialTemplateEntry[] = [
    {
      id: SEO_LANDING_TEMPLATE_ID,
      name: "Landing promocional SEO",
      description:
        "Página de promoción independiente del perfil oficial: portada, distintivos, oferta, información y cierre.",
      publicRoute: "/l/{slug}",
      pageKind: "landing",
      workingSlug: null,
      creatable: false,
    },
  ];

  return [
    {
      key: "inicio",
      label: "Inicio",
      purpose: "La portada del sitio y su recorrido principal de descubrimiento.",
      entries: home,
    },
    {
      key: "destinos",
      label: "Destinos",
      purpose: "Micrositio de cada destino del Oriente Maya.",
      entries: destinos,
    },
    {
      key: "listados",
      label: "Listados turísticos",
      purpose: "Páginas que agrupan hospedaje, gastronomía, experiencias, eventos y planes.",
      entries: listados,
    },
    {
      key: "lugares",
      label: "Lugares y sitios de interés",
      purpose: "Fichas de cenotes, zonas arqueológicas, museos, patrimonio y mercados.",
      entries: lugares,
    },
    {
      key: "fichas",
      label: "Fichas de empresa, producto y evento",
      purpose:
        "Se aplican automáticamente a cada ficha publicada según su categoría o tipo de producto.",
      entries: fichas,
    },
    {
      key: "landing",
      label: "Landing promocional",
      purpose: "Promociones y campañas con dirección propia, separadas del perfil oficial.",
      entries: landing,
    },
  ];
}

/**
 * Árbol inicial de una composición creada desde un preset premium
 * aprobado. Reutiliza el bloque compuesto del preset; no crea bloques
 * nuevos ni variantes paralelas.
 */
export function buildPresetCompositionTree(presetId: string): CompositionTree | null {
  const preset = PREMIUM_TEMPLATE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return {
    root: {
      id: "root",
      type: "root",
      version: "1.0.0",
      config: {},
      children: [
        {
          id: `${preset.id}-node`,
          type: preset.blockType,
          version: preset.contractVersion,
          config: preset.defaultConfig(),
        },
      ],
    },
  } as unknown as CompositionTree;
}

/**
 * Preset premium por defecto de un tipo de página. Si el tipo no tiene
 * plantilla aprobada declarada, devuelve `null` (fail-closed): nunca se
 * cae en una plantilla genérica.
 */
export function defaultPresetIdForPageKind(pageKind: string): string | null {
  const match = PREMIUM_TEMPLATE_PRESETS.find((p) => p.pageKinds.some((k) => k === pageKind));
  return match ? match.id : null;
}
