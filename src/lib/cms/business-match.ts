/**
 * business-match — Detección de empresas ya existentes al dar de alta.
 * Lógica pura (sin red) para poder probarla y reutilizarla.
 */

const STOPWORDS = new Set([
  "hotel", "hoteles", "restaurante", "restaurant", "casa", "boutique", "the", "el", "la",
  "los", "las", "de", "del", "y", "&", "b&b", "bed", "breakfast", "hostal", "suites",
]);

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function keyTokens(s: string): string[] {
  return normalizeName(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** ¿El nombre escrito coincide con una empresa existente (nombre o slug)? */
export function isBusinessMatch(query: string, name: string, slug = ""): boolean {
  const q = normalizeName(query);
  if (q.length < 3) return false;
  const n = normalizeName(name);
  const sl = normalizeName(slug);
  const compact = (x: string) => x.replace(/ /g, "");
  if (n.includes(q) || compact(n).includes(compact(q)) || compact(sl).includes(compact(q))) return true;
  const qt = keyTokens(query);
  if (qt.length === 0) return false;
  const nt = new Set([...keyTokens(name), ...keyTokens(slug)]);
  return qt.every((t) => [...nt].some((x) => x.startsWith(t) || t.startsWith(x)));
}
