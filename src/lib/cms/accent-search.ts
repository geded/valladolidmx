/**
 * accent-search — Búsqueda del CMS sin importar acentos ni mayúsculas.
 *
 * Convierte lo que escribe el editor en un patrón POSIX para el operador
 * `imatch` (~*) de la base: «tia» encuentra «Tía», «pina» encuentra «Piña».
 * Sólo deja letras, números y espacios; cualquier otro signo se vuelve «.»
 * (cualquier carácter), así el patrón nunca rompe la consulta.
 */
const VARIANTS: Record<string, string> = {
  a: "aáàäâã",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöôõ",
  u: "uúùüû",
  n: "nñ",
  c: "cç",
};

/** Letras mínimas para empezar a buscar mientras se escribe. */
export const CMS_SEARCH_MIN_CHARS = 2;
/** Espera tras la última tecla antes de buscar. */
export const CMS_SEARCH_DEBOUNCE_MS = 300;

export function accentInsensitivePattern(term: string): string {
  const base = term
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  let out = "";
  for (const ch of base) {
    const variants = VARIANTS[ch];
    if (variants) out += `[${variants}${variants.toUpperCase()}]`;
    else if (/[\p{L}\p{N} ]/u.test(ch)) out += ch;
    else out += ".";
  }
  return out;
}

/** Filtro PostgREST `or` que busca el término en varias columnas. */
export function accentInsensitiveOr(columns: string[], term: string): string | null {
  const pattern = accentInsensitivePattern(term);
  if (!pattern) return null;
  return columns.map((c) => `${c}.imatch."${pattern}"`).join(",");
}

/** ¿Ya hay suficientes letras para buscar? (vacío también cuenta: limpia). */
export function shouldRunSearch(draft: string): boolean {
  const t = draft.trim();
  return t.length === 0 || t.length >= CMS_SEARCH_MIN_CHARS;
}
