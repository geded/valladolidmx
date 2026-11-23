/**
 * Enlaces cortos de empresa — `/<categoría>/<empresa>`.
 *
 * Dirección para promoción (redes, WhatsApp, QR) que redirige 301 a la
 * ficha canónica territorial. No es una identidad pública nueva: la ruta
 * `/oriente-maya/:destino/:categoria/:empresa` sigue siendo la única
 * dirección canónica (Navigation Blueprint v1.0).
 *
 * La categoría acepta su forma plural institucional (`restaurantes`) o su
 * singular en español (`restaurante`, `hotel`, `casa-de-vacaciones`).
 */
import { normalizeRouteSlug } from "./canonical-paths";

/** Singular español del primer término de un slug de categoría. */
export function singularCategorySlug(categorySlug: string): string {
  const slug = normalizeRouteSlug(categorySlug);
  const [first = "", ...rest] = slug.split("-");
  let word = first;
  if (/[lnrdj]es$/.test(word)) word = word.slice(0, -2);
  else if (word.endsWith("s") && word.length > 3) word = word.slice(0, -1);
  return [word, ...rest].join("-");
}

/** ¿El segmento pedido corresponde a la categoría de la empresa? */
export function shortCategoryMatches(requested: string, categorySlug: string): boolean {
  const asked = normalizeRouteSlug(requested);
  if (!asked) return false;
  return asked === normalizeRouteSlug(categorySlug) || asked === singularCategorySlug(categorySlug);
}

/** Dirección corta oficial (categoría en singular). */
export function businessShortPath(categorySlug: string, businessSlug: string): string {
  return `/${encodeURIComponent(singularCategorySlug(categorySlug))}/${encodeURIComponent(
    normalizeRouteSlug(businessSlug),
  )}`;
}
