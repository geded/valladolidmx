/**
 * Context Engine — Tipos base (H-02 · I1).
 *
 * Context Engine oficial de la Discovery Layer. La navegación (breadcrumbs,
 * menús) es sólo uno de sus consumidores. Otros consumidores previstos:
 * SEO, Experience Builder, Recomendaciones, Alux, Analytics, Personalización.
 *
 * Infra base (I1): sólo tipos + resolver + provider + store del recorrido
 * previo. NO se monta en rutas reales. NO altera UX, SEO ni rutas.
 */

/**
 * Tipos canónicos de entidad reconocidos por el Context Engine.
 * Superconjunto pragmático de `PageKind` (page-kind-registry) + agregados
 * de agrupación (`category`, `blog_post`). No sustituye al registry: el
 * registry sigue siendo la fuente de verdad de páginas del EB.
 */
export type ContextEntityKind =
  | "home"
  | "region"
  | "destination"
  | "category"
  | "marketplace"
  | "business"
  | "product"
  | "event"
  | "experience"
  | "hotel"
  | "restaurant"
  | "route"
  | "landing"
  | "campaign"
  | "microsite"
  | "promo"
  | "institutional"
  | "blog_post"
  | "alux"
  | "trip_builder"
  | "wedding"
  | "ai_generated"
  | "custom"
  | "site_section";

/**
 * Nodo mínimo dentro de un contexto. Todos los campos salvo `kind` y
 * `label` son opcionales para permitir contextos parciales (herencia,
 * fallback) sin fricción.
 */
export interface ContextNode {
  readonly kind: ContextEntityKind;
  readonly label: string;
  readonly slug?: string;
  /** Path canónico ("/oriente-maya/valladolid"). Sin origen. */
  readonly href?: string;
  readonly params?: Readonly<Record<string, string>>;
  /** Metadata libre para consumidores (SEO, Alux, analytics). No usar para lógica del engine. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Origen del contexto — trazabilidad para debug/analytics.
 * - `route`: declarado explícitamente por la ruta actual.
 * - `inherited`: heredado del recorrido previo (whitelist).
 * - `kind-default`: ancestros por defecto del kind (page-kind-registry ext.).
 * - `composed`: composición de dos o más de los anteriores.
 */
export type ContextSource = "route" | "inherited" | "kind-default" | "composed";

/**
 * Contexto resuelto que consumen breadcrumbs, menús, SEO, Alux, etc.
 * `canonical` SIEMPRE es la URL de la ruta actual (nunca heredada) —
 * la herencia afecta breadcrumbs/relacionados/UX, jamás señales SEO.
 */
export interface ResolvedContext {
  readonly current: ContextNode;
  readonly ancestors: readonly ContextNode[];
  readonly region?: ContextNode;
  readonly destination?: ContextNode;
  readonly category?: ContextNode;
  readonly parent?: ContextNode;
  readonly canonical: string;
  readonly previous?: PreviousContext;
  readonly related: readonly ContextNode[];
  readonly source: ContextSource;
}

/**
 * Recorrido inmediato anterior. Persistido en `history.state` +
 * `sessionStorage` con TTL corto. Ausente en SSR (undefined).
 */
export interface PreviousContext {
  readonly from: ContextNode;
  /** Ancestros del contexto anterior — habilita herencia multinivel. */
  readonly ancestors: readonly ContextNode[];
  readonly at: number;
}

/**
 * Declaración de contexto que hace una ruta. Diseñado para ser el
 * único punto de entrada de datos al engine desde la capa de rutas.
 *
 * `inherit` es una whitelist estricta: sólo los slots listados pueden
 * heredarse del recorrido previo. Si `inherit` es `undefined` o `[]`,
 * no hay herencia (comportamiento seguro por defecto).
 */
export interface RouteContextDeclaration {
  readonly current: ContextNode;
  readonly ancestors?: readonly ContextNode[];
  readonly related?: readonly ContextNode[];
  readonly inherit?: readonly ("region" | "destination" | "category")[];
  readonly canonical: string;
  /**
   * Ancestros por defecto si ni la ruta ni la herencia los proveen.
   * Alternativa declarativa a extender `page-kind-registry` en I1.
   */
  readonly kindDefaults?: readonly ContextNode[];
}

/**
 * Reglas de herencia. Cada entrada indica: "si venías de X y ahora
 * estás en Y, puedes heredar estos slots". Whitelist estricta.
 */
export interface InheritanceRule {
  readonly from: ContextEntityKind;
  readonly to: ContextEntityKind;
  readonly slots: readonly ("region" | "destination" | "category")[];
}

/**
 * Eventos emitidos por el Context Engine. Consumidos por analytics,
 * debugging y (futuro) Alux. Namespace `context_engine.*` reservado.
 */
export type ContextEngineEvent =
  | "context_engine.resolved"
  | "context_engine.inherited"
  | "context_engine.previous_saved"
  | "context_engine.previous_expired"
  | "context_engine.fallback_kind_default"
  | "context_engine.declaration_missing";

export interface ContextEngineEventMeta {
  readonly kind?: ContextEntityKind;
  readonly currentHref?: string;
  readonly previousHref?: string;
  readonly source?: ContextSource;
  readonly inheritedSlots?: readonly string[];
  readonly at: number;
}

export type ContextEngineEventListener = (
  event: ContextEngineEvent,
  meta: ContextEngineEventMeta,
) => void;