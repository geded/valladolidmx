/**
 * G8-R1-F1G · Autoridad interna del lote de contenido de evaluación.
 *
 * `G8-R1-F1G-EVALUATION-CONTENT` es una marca INTERNA. Nunca se muestra al
 * visitante, nunca se convierte en badge, aviso ni etiqueta pública. Su
 * única función es permitir que la plataforma:
 *
 *  1. excluya el lote del sitemap,
 *  2. lo marque `noindex, nofollow` mientras está en evaluación,
 *  3. lo excluya del catálogo canónico que consume Alux,
 *  4. lo gestione desde la herramienta interna de Administración.
 *
 * Invariantes: cero borrado físico, cero publicación automática, cero
 * modificación de fechas y flag visual global sin alterar.
 */
export const EVALUATION_LOT_ID = "G8-R1-F1G-EVALUATION-CONTENT" as const;

/** Familias sujetas a la marca de lote. */
export const EVALUATION_LOT_FAMILIES = [
  "destination",
  "business",
  "product",
  "event",
  "place",
] as const;

export type EvaluationLotFamily = (typeof EVALUATION_LOT_FAMILIES)[number];

export interface EvaluationLotSlugs {
  destination: string[];
  business: string[];
  product: string[];
  event: string[];
  place: string[];
}

export const EMPTY_EVALUATION_LOT: EvaluationLotSlugs = Object.freeze({
  destination: [],
  business: [],
  product: [],
  event: [],
  place: [],
});

/** ¿La ficha pertenece al lote de evaluación y por tanto no es indexable? */
export function isInEvaluationLot(
  lot: EvaluationLotSlugs | null | undefined,
  family: EvaluationLotFamily,
  slug: string | null | undefined,
): boolean {
  if (!lot || !slug) return false;
  return (lot[family] ?? []).includes(slug);
}
