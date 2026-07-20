/**
 * MCP · Protección de búsqueda (R3).
 * Sanitiza queries de texto libre antes de pasarlas a ILIKE/FTS.
 */

export type SanitizeOk = { ok: true; value: string };
export type SanitizeErr = { ok: false; error: string };
export type SanitizeResult = SanitizeOk | SanitizeErr;

const MIN_ALNUM = 3;
const MAX_LEN = 60;

export function sanitizeSearchQuery(input: string): SanitizeResult {
  if (typeof input !== "string") return { ok: false, error: "Query inválida." };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, error: "Query vacía." };
  if (trimmed.length > MAX_LEN)
    return { ok: false, error: `Query supera ${MAX_LEN} caracteres.` };

  // Rechaza patrones compuestos exclusivamente por wildcards o comodines.
  const wildcardOnly = /^[%_*?\s\\]+$/;
  if (wildcardOnly.test(trimmed))
    return { ok: false, error: "Query no puede ser sólo comodines." };

  // Requiere al menos MIN_ALNUM caracteres alfanuméricos (Unicode).
  const alnumMatches = trimmed.match(/[\p{L}\p{N}]/gu);
  if (!alnumMatches || alnumMatches.length < MIN_ALNUM)
    return { ok: false, error: `Requiere al menos ${MIN_ALNUM} caracteres alfanuméricos.` };

  // Escapa comodines de LIKE.
  const escaped = trimmed.replace(/[\\%_]/g, (m) => `\\${m}`);
  return { ok: true, value: escaped };
}

export const SEARCH_RESULT_HARD_CAP = 25;
