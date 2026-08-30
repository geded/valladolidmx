/**
 * G8-R1-F1H · Remediación puntual — Cuarentena de fichas `owner_submitted`
 * sin revisión editorial.
 *
 * Tres empresas reales enviadas por sus propietarios permanecen publicadas
 * pero NO han pasado revisión editorial ni acreditación de procedencia. Se
 * mantienen intactas (contenido, estado y datos sin cambios) y únicamente
 * se aíslan de superficies de descubrimiento:
 *
 *   1. `noindex, nofollow` en su ficha pública y en la de sus productos,
 *   2. exclusión del `sitemap.xml`,
 *   3. exclusión del catálogo canónico que consume Alux.
 *
 * Rollback: vaciar `QUARANTINED_BUSINESS_SLUGS` (una sola constante). No hay
 * cambios de datos que revertir en la base.
 */

export const UNREVIEWED_QUARANTINE_ID = "G8-R1-F1H-UNREVIEWED-QUARANTINE" as const;

/** Empresas `owner_submitted` publicadas sin revisión editorial. */
export const QUARANTINED_BUSINESS_SLUGS: readonly string[] = [
  "hacienda-san-servacio-boutique",
  "cocina-del-frailes",
  "ruta-cenotes-y-selva",
];

const SET = new Set(QUARANTINED_BUSINESS_SLUGS);

/** ¿La empresa está en cuarentena editorial (no indexable, fuera de Alux)? */
export function isQuarantinedBusiness(slug: string | null | undefined): boolean {
  return typeof slug === "string" && SET.has(slug);
}
