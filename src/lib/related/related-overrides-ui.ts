/**
 * related/related-overrides-ui.ts — Lenguaje y reglas visibles del panel
 * «Colecciones relacionadas» (CMS).
 *
 * Capa pura, sin React ni base de datos: sirve para que el panel embebido en
 * cada editor y la página `/cms/relacionados` expliquen lo mismo con las
 * mismas palabras, y para que las pruebas puedan comprobar que el panel sólo
 * ofrece lo que la ficha pública realmente lee.
 */
import type { RelatedEntityKind, RelatedOverrideMode } from "./overrides.functions";

/** Nombre con el que el editor conoce cada tipo de ficha. */
export const KIND_LABELS: Record<RelatedEntityKind, string> = {
  business: "Empresa",
  product: "Producto",
  destination: "Destino",
  event: "Evento",
};

/**
 * Tipos de relacionado que la ficha pública realmente aplica.
 *
 * Cada fetcher público filtra `related_entity_type` a su propia familia
 * (empresa→empresa, producto→producto, evento→evento); la página de destino
 * es la única que lee tres familias a la vez. Un override de otra familia se
 * guarda pero no se ve, así que el panel no debe ofrecerlo.
 */
export const HONOURED_RELATED_KINDS: Record<RelatedEntityKind, RelatedEntityKind[]> = {
  business: ["business"],
  product: ["product"],
  destination: ["business", "product", "event"],
  event: ["event"],
};

/** Familias de relacionado que tienen sentido para la ficha que se está editando. */
export function honouredRelatedKinds(entityType: RelatedEntityKind): RelatedEntityKind[] {
  return HONOURED_RELATED_KINDS[entityType] ?? [];
}

/** Etiqueta en español del modo. */
export const MODE_LABELS: Record<RelatedOverrideMode, string> = {
  pin: "Aparece primero",
  hide: "Que no aparezca",
};

/** Explicación de una línea de cada modo, para el editor. */
export const MODE_HELP: Record<RelatedOverrideMode, string> = {
  pin: "Sube este elemento al principio de la lista, aunque las reglas automáticas lo pongan más atrás.",
  hide: "Quita este elemento de la lista. Las demás recomendaciones se quedan como están.",
};

/**
 * Sección pública que este panel controla, con el nombre que ve el visitante.
 * Coincide con los títulos reales de cada superficie.
 */
export const RELATED_SECTION_NAMES: Record<RelatedEntityKind, string> = {
  business: "«Explora cerca de …»",
  product: "«Sigue descubriendo»",
  destination: "«Sigue descubriendo»",
  event: "«Explora cerca de …»",
};

/** Límite de elementos fijados que la ficha pública muestra. */
export const MAX_PINS_SHOWN = 6;

/** Frase de ayuda general para el panel embebido en el editor. */
export function relatedPanelIntro(entityType: RelatedEntityKind): string {
  const section = RELATED_SECTION_NAMES[entityType];
  return `Esta ficha muestra la lista ${section} al final de la página. Aquí decides si algo debe aparecer primero o no debe aparecer. Sin esto, la lista se arma sola con las reglas automáticas.`;
}
