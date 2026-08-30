/**
 * G8-R1-F1I-R1 · DEF-F1I-001 — Autoridad única de elegibilidad pública.
 *
 * Sustituye a la lista de slugs en cuarentena (`unreviewed-quarantine.ts`,
 * G8-R1-F1H) por una regla **derivada del dato**, aplicada server-side y
 * compartida por TODAS las superficies de descubrimiento:
 *
 *   listados · Home · buscador · relacionados · tarjetas · sitemap ·
 *   catálogo de Alux · recomendaciones.
 *
 * REGLA (fail-closed):
 *   Una empresa publicada sólo es *descubrible* si su revisión de fuente
 *   está acreditada: `businesses.source_review_state = 'approved'`.
 *
 * Consecuencias deliberadas:
 *   · `owner_submitted` sin revisión (`unreviewed`/`in_review`/`stale`/
 *     `rejected`) queda fuera de descubrimiento SIN tocar su registro,
 *     contenido, estado, ruta directa ni auditoría.
 *   · Su ruta directa sigue respondiendo 200 con `noindex, nofollow`.
 *   · Al aprobarse editorialmente (`source_review_state = 'approved'`), la
 *     ficha vuelve a las superficies públicas automáticamente, sin ninguna
 *     corrección manual de código.
 *
 * Prohibido crear filtros equivalentes por superficie: toda consulta pública
 * de empresas debe pasar por `applyPublicBusinessEligibility` (consulta) o
 * `isPubliclyDiscoverableBusiness` (fila ya materializada).
 */

export const PUBLIC_ELIGIBILITY_AUTHORITY_ID = "G8-R1-F1I-R1-PUBLIC-ELIGIBILITY" as const;

/** Único estado de revisión que habilita descubrimiento público. */
export const PUBLIC_APPROVED_REVIEW_STATE = "approved" as const;

/** Columnas mínimas que toda consulta pública de empresas debe seleccionar. */
export const BUSINESS_ELIGIBILITY_COLUMNS = "source_review_state" as const;

export interface BusinessEligibilityFields {
  readonly source_review_state?: unknown;
}

/**
 * ¿La empresa es elegible para superficies públicas de descubrimiento?
 * Fail-closed: sin campo o con cualquier estado distinto de `approved`, no.
 */
export function isPubliclyDiscoverableBusiness(row: BusinessEligibilityFields | null | undefined) {
  return row?.source_review_state === PUBLIC_APPROVED_REVIEW_STATE;
}

/** Filtra en memoria filas ya leídas (cuando la consulta no puede tiparse). */
export function filterPubliclyDiscoverableBusinesses<T extends BusinessEligibilityFields>(
  rows: readonly T[] | null | undefined,
): T[] {
  return (rows ?? []).filter((row) => isPubliclyDiscoverableBusiness(row));
}

/**
 * Filtro canónico para encadenar en TODA consulta pública de `businesses`:
 *
 *   sb.from("businesses").select(...).eq(...PUBLIC_BUSINESS_ELIGIBILITY_EQ)
 *
 * Se expone como tupla (y no como envoltorio genérico) para no perder el
 * tipado del query builder de Supabase en consultas con relaciones.
 */
export const PUBLIC_BUSINESS_ELIGIBILITY_EQ = [
  "source_review_state",
  PUBLIC_APPROVED_REVIEW_STATE,
] as const;
