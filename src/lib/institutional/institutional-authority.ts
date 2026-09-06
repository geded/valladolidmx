/**
 * Lote 3B · C — Autoridad institucional administrable.
 *
 * Qué destinos ostentan cada distintivo institucional (Pueblo Mágico,
 * Despierta en Valladolid, Marca Oriente Maya…) deja de ser una lista
 * autoritativa en código: se administra desde el CMS y se persiste en
 * `platform_settings` bajo la clave `institutional.badges.authority`.
 *
 * Reparto de responsabilidades (Institutional Badges Rule):
 *  - `institutional-badges.registry.ts` valida el CONTRATO del distintivo
 *    (kind válido, iconografía, token de color, prioridad, modo de
 *    verificación). Sus `restrictedSlugs` quedan como FALLBACK seguro.
 *  - Este módulo mantiene la AUTORIDAD vigente (qué slugs la ostentan),
 *    resuelta desde el CMS y compartida por todas las superficies.
 *
 * El store es un módulo sincrónico: se hidrata una vez por request en el
 * servidor y una vez tras la hidratación en el cliente, de modo que los
 * helpers existentes (`isBadgeAuthorized`, `buildDestinationBadgeItems`)
 * siguen siendo sincrónicos y no cambia ninguna firma pública.
 */

export const INSTITUTIONAL_AUTHORITY_KEY = "institutional.badges.authority";

/** Mapa `kind` → slugs autorizados. Ausencia de clave = sin override. */
export type InstitutionalAuthority = Readonly<Record<string, readonly string[]>>;

let CURRENT: InstitutionalAuthority | null = null;

/** Normaliza cualquier valor persistido a slugs limpios en minúsculas. */
export function normalizeInstitutionalAuthority(value: unknown): InstitutionalAuthority {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [kind, slugs] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(slugs)) continue;
    const clean = slugs
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    // Una lista vacía sí es una decisión válida (retirar la autoridad).
    out[kind] = Array.from(new Set(clean));
  }
  return out;
}

/** Hidrata la autoridad vigente (SSR o cliente). Idempotente. */
export function setInstitutionalAuthority(value: unknown): void {
  CURRENT = normalizeInstitutionalAuthority(value);
}

/** Autoridad vigente, o `null` si aún no se ha hidratado. */
export function getInstitutionalAuthority(): InstitutionalAuthority | null {
  return CURRENT;
}

/**
 * Slugs autorizados para un `kind`, según el CMS.
 * Devuelve `undefined` cuando el CMS no se pronuncia sobre ese
 * distintivo: en ese caso el registry aplica su fallback seguro.
 */
export function getAuthorizedSlugs(kind: string): readonly string[] | undefined {
  return CURRENT?.[kind];
}

/** Sólo para pruebas y rollback: vuelve al fallback del registry. */
export function resetInstitutionalAuthority(): void {
  CURRENT = null;
}
