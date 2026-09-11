/**
 * A13 · Floating Alux event bus.
 *
 * Micro bus DOM (CustomEvent) para abrir el concierge flotante desde
 * cualquier parte del árbol sin acoplar componentes ni introducir un
 * provider global. Usado por el banner proactivo territorial y por
 * cards que quieran invocar a Alux con contexto pre-cargado.
 */

export type AluxOpenReason = "nearby-suggestion" | "context-chip" | "manual";

/**
 * Lote 3J.1 · Selección estructurada.
 *
 * Las superficies que invocan a Alux ya conocen la entidad activa. En vez de
 * degradarla a texto libre dentro de `hint`, la entregan aquí con sus IDs
 * canónicos para que el dock la consuma y la muestre como contexto vivo.
 */
export interface AluxOpenSelection {
  /** Referencia canónica `kind:id` (ej. `place:<uuid>`, `business:<uuid>`). */
  readonly entityRef?: string;
  /** Título editorial de la entidad seleccionada. */
  readonly title?: string;
  /** Contexto editorial necesario para adaptar la selección sin perder su secuencia. */
  readonly summary?: string;
  /** Slug del destino territorial al que pertenece la selección. */
  readonly destinationSlug?: string;
  /** Etiqueta legible del destino (CMS), nunca inventada. */
  readonly destinationLabel?: string;
  /** Familia o categoría canónica (`lugares`, `hoteles`, …). */
  readonly familySlug?: string;
  /** Ruta canónica de la entidad seleccionada. */
  readonly href?: string;
  /**
   * Datos turísticos legibles (duración, paradas, ritmo, origen→destino) que
   * el dock muestra en "Tu selección". Nunca instrucciones internas ni prompts.
   */
  readonly facts?: readonly string[];
  /** Acciones rápidas contextuales que alimentan el chat existente. */
  readonly quickActions?: readonly string[];
  /**
   * Ancla existente en la superficie invocante donde ya vive un mapa
   * (`#mapa` del Home). Si está presente, el dock ofrece volver a él.
   */
  readonly mapAnchor?: string;
}

/**
 * Petición para enfocar la selección en el mapa YA EXISTENTE de la superficie
 * invocante. No crea mapa ni motor geográfico: sólo avisa a quien lo posee.
 */
export interface AluxMapFocusPayload {
  readonly entityRef?: string;
  readonly anchor?: string;
  /**
   * Qué debe representar el mapa existente: la ruta publicada tal cual
   * ("original") o la secuencia ya propuesta por Alux ("proposal").
   */
  readonly variant?: "original" | "proposal";
  /**
   * Títulos canónicos de la secuencia propuesta, en orden. La superficie
   * dueña del mapa sólo usa los que coinciden con sus puntos publicados;
   * jamás se inventan coordenadas ni paradas.
   */
  readonly sequenceTitles?: readonly string[];
}

const MAP_FOCUS_EVENT = "alux:map-focus";

export function requestAluxMapFocus(payload: AluxMapFocusPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AluxMapFocusPayload>(MAP_FOCUS_EVENT, { detail: payload }));
}

export function onAluxMapFocus(handler: (payload: AluxMapFocusPayload) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent<AluxMapFocusPayload>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(MAP_FOCUS_EVENT, listener);
  return () => window.removeEventListener(MAP_FOCUS_EVENT, listener);
}

export interface AluxOpenPayload {
  reason: AluxOpenReason;
  hint?: string;
  /** Contexto estructurado que el dock consume tal cual (Lote 3J.1). */
  selection?: AluxOpenSelection;
}

const EVENT = "alux:open";

export function openAluxFloating(payload: AluxOpenPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AluxOpenPayload>(EVENT, { detail: payload }));
}

export function onAluxFloatingOpen(handler: (payload: AluxOpenPayload) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent<AluxOpenPayload>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
