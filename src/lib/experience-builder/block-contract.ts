/**
 * Experience Builder · Block Contract (Etapa 15.10.1)
 *
 * Contrato único y obligatorio para registrar bloques en la Block Library.
 * NINGÚN bloque puede registrarse fuera de este contrato.
 *
 * Principios aprobados:
 *  - Composición por Bloques (Plan 15.10 v1.1).
 *  - Static Blocks vs Smart Blocks (Adenda 15.10.1).
 *  - Block Capability System (Adenda 15.10.1 · ampliación 1).
 *  - Block Marketplace Readiness: extensión declarativa, sin tocar el núcleo
 *    del Experience Builder (Adenda 15.10.1 · ampliación 2).
 */

export type BlockCategory = "static" | "smart";

/**
 * Capacidades declarativas del bloque. El Experience Builder usa estos flags
 * para saber automáticamente qué puede hacer cada bloque sin acoplarse a su
 * implementación.
 */
export interface BlockCapabilities {
  soporta_i18n?: boolean;
  soporta_seo?: boolean;
  soporta_programacion?: boolean;
  soporta_preview?: boolean;
  soporta_datos_dinamicos?: boolean;
  soporta_personalizacion?: boolean;
  soporta_responsive?: boolean;
  soporta_cache?: boolean;
  /** Extensibilidad: capacidades futuras sin modificar el núcleo. */
  [extra: string]: boolean | undefined;
}

/** Tipo de un campo dentro del schema declarativo del bloque. */
export type BlockFieldType =
  | "text"
  | "rich_text"
  | "number"
  | "boolean"
  | "url"
  | "color"
  | "media"
  | "reference"
  | "select"
  | "list"
  | "object";

export interface BlockFieldSchema {
  type: BlockFieldType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  /** Marca el campo como traducible vía la tabla `translations`. */
  translatable?: boolean;
  /** Para `media`: tipos MIME permitidos. */
  accepts?: string[];
  /** Para `select`: opciones permitidas. */
  options?: Array<{ value: string; label: string }>;
  /** Para `reference`: dominio referenciado (read-only). */
  references?: "destination" | "business" | "product" | "event" | "promotion" | "page" | "media_asset";
  /** Para `list` / `object`: subesquema. */
  fields?: Record<string, BlockFieldSchema>;
  /** Para `list`: subesquema del item. */
  item?: BlockFieldSchema;
}

export type BlockSchema = Record<string, BlockFieldSchema>;

/**
 * Fuente de datos permitida para Smart Blocks. Cada entrada apunta a una
 * server function read-only ya aprobada en Olas 1–6 o a un canal BEA público.
 * Static Blocks NO declaran data sources.
 */
export interface BlockDataSource {
  domain:
    | "marketplace"
    | "businesses"
    | "destinations"
    | "events"
    | "promotions"
    | "reviews"
    | "bea"
    | "alux";
  /**
   * Server function read-only ya aprobada. Opcional cuando el Smart Block
   * declara una `query` declarativa resuelta por `resolveSmartBlock`.
   */
  reader?: string;
  read_only: true;
  /**
   * Query declarativa (15.10.8.1). Cuando está presente, el resolver
   * server-side (`resolveSmartBlock`, 15.10.8.2) ejecuta la consulta sobre
   * la tabla pública indicada respetando RLS `anon`. Se ignora si además
   * se provee `reader` explícito.
   */
  query?: SmartBlockQuery;
}

/**
 * Operadores de filtro permitidos para queries declarativas de Smart Blocks.
 * Espejo estrecho de PostgREST — solo lectura, sin joins arbitrarios.
 */
export type SmartBlockFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "ilike";

export interface SmartBlockFilter {
  column: string;
  op: SmartBlockFilterOp;
  value: string | number | boolean | Array<string | number>;
}

export interface SmartBlockOrderBy {
  column: string;
  direction?: "asc" | "desc";
}

/**
 * Query declarativa read-only para Smart Blocks. La tabla debe estar
 * expuesta por Data API con política `TO anon` de solo SELECT.
 */
export interface SmartBlockQuery {
  table:
    | "destinations"
    | "destination_zones"
    | "businesses"
    | "products"
    | "events"
    | "promotions"
    | "articles";
  /** Columnas seguras a proyectar. `*` NO permitido. */
  select: string[];
  filters?: SmartBlockFilter[];
  order_by?: SmartBlockOrderBy[];
  limit?: number;
}

/** Restricciones declarativas del bloque dentro de una composición. */
export interface BlockConstraints {
  /** Superficies en las que el bloque puede colocarse. */
  surfaces?: Array<"home" | "landing" | "institutional" | "destination" | "business" | "product">;
  /** Profundidad máxima de anidación dentro de contenedores. */
  max_nesting_depth?: number;
  /** Mínimo / máximo de hijos cuando el bloque es contenedor. */
  min_children?: number;
  max_children?: number;
  /** Si solo puede existir una instancia por página. */
  unique_per_page?: boolean;
}

/**
 * Compatibilidad responsive declarada. Esta etapa solo DECLARA; el Responsive
 * Builder se construye en 15.10.9.
 */
export interface BlockResponsive {
  breakpoints?: Array<"desktop" | "tablet" | "mobile">;
  /** Campos del schema que admiten override por breakpoint. */
  overridable_fields?: string[];
}

/** Compatibilidad multilenguaje declarada (delega persistencia a `translations`). */
export interface BlockI18n {
  /** Lista de campos del schema marcados como traducibles. */
  translatable_fields?: string[];
  /** Política de fallback cuando no existe traducción. */
  fallback?: "base_language" | "hide";
}

/** Eventos BEA que emite el bloque cuando su definición o versión cambian. */
export type BlockAuditEvent =
  | "Block.Registered"
  | "Block.VersionPublished"
  | "Block.Deprecated"
  | "BlockLibrary.Updated";

/**
 * Block Contract · única forma autorizada de declarar un bloque.
 * El Registry rechaza cualquier definición que no cumpla este contrato.
 */
export interface BlockContract {
  /** Identificador único, namespaced (e.g. "vmx.hero", "vmx.smart.featured-businesses"). */
  type: string;
  /** Categoría exclusiva. */
  category: BlockCategory;
  /** Versión semántica activa. */
  version: string;
  /** Versiones aún soportadas por adaptadores. */
  supported_versions?: string[];
  /** Nombre legible para roles editoriales. */
  display_name: string;
  /** Descripción operativa breve. */
  description?: string;
  /** Esquema declarativo de configuración. */
  schema: BlockSchema;
  /** Capacidades declaradas (Block Capability System). */
  capabilities: BlockCapabilities;
  /** Fuentes de datos permitidas. Solo Smart Blocks. */
  data_sources?: BlockDataSource[];
  /** Restricciones declarativas. */
  constraints?: BlockConstraints;
  /** Compatibilidad responsive declarada. */
  responsive?: BlockResponsive;
  /** Compatibilidad multilenguaje declarada. */
  i18n?: BlockI18n;
  /** Eventos BEA emitidos por este bloque. */
  audit?: BlockAuditEvent[];
}

/** Resultado de validación. */
export interface BlockContractValidation {
  valid: boolean;
  errors: string[];
}

const TYPE_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

/**
 * Valida un Block Contract antes de registrarlo. Esta es la PRIMERA línea de
 * defensa del Registry. La validación SQL en `eb_register_block` es la
 * segunda.
 */
export function validateBlockContract(c: BlockContract): BlockContractValidation {
  const errors: string[] = [];

  if (!TYPE_RE.test(c.type)) errors.push(`invalid type "${c.type}" — must be namespaced lowercase`);
  if (!SEMVER_RE.test(c.version)) errors.push(`invalid version "${c.version}" — must be MAJOR.MINOR.PATCH`);
  if (!c.display_name || c.display_name.trim().length === 0) errors.push("display_name is required");
  if (!c.schema || typeof c.schema !== "object") errors.push("schema is required");
  if (!c.capabilities) errors.push("capabilities are required");

  if (c.category === "smart") {
    if (!c.data_sources || c.data_sources.length === 0) {
      errors.push("smart blocks must declare at least one data_source");
    } else {
      for (const ds of c.data_sources) {
        if (ds.read_only !== true) errors.push(`data source "${ds.reader}" must be read_only`);
      }
    }
    if (c.capabilities.soporta_datos_dinamicos !== true) {
      errors.push("smart blocks must declare capability soporta_datos_dinamicos = true");
    }
  }

  if (c.category === "static" && c.data_sources && c.data_sources.length > 0) {
    errors.push("static blocks must not declare data_sources");
  }

  // Coherencia i18n: cada campo traducible debe existir en schema.
  for (const f of c.i18n?.translatable_fields ?? []) {
    if (!c.schema[f]) errors.push(`i18n.translatable_fields references missing schema field "${f}"`);
  }

  // Coherencia responsive: cada campo overridable debe existir.
  for (const f of c.responsive?.overridable_fields ?? []) {
    if (!c.schema[f]) errors.push(`responsive.overridable_fields references missing schema field "${f}"`);
  }

  return { valid: errors.length === 0, errors };
}