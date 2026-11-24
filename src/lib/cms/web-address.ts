/**
 * Guardia de «Dirección web» (slug) para el CMS.
 *
 * La dirección web es el final de la dirección de una página
 * (p. ej. `el-cuyo`). Si un editor pega ahí un enlace completo
 * (`https://…`), la página nunca puede abrirse. Esta guardia rechaza sólo
 * lo que jamás funciona dentro de una dirección: diagonales, dos puntos,
 * signos de pregunta, almohadillas, signos de igual, `&`, `%` y espacios.
 * Direcciones antiguas con guion bajo o punto siguen aceptándose para no
 * romper fichas existentes.
 */
const BROKEN_CHARS = /[/\\:?#=&%\s]/;

export function webAddressProblem(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const value = slug.trim();
  if (!value) return null;
  if (!BROKEN_CHARS.test(value)) return null;
  const looksLikeLink = /^(https?:)?\/\//i.test(value) || /^www\./i.test(value);
  return looksLikeLink
    ? "La «Dirección web» no puede ser un enlace completo. Escribe sólo el final de la dirección, en minúsculas y con guiones, por ejemplo: el-cuyo."
    : "La «Dirección web» sólo puede llevar letras minúsculas, números y guiones, sin espacios ni signos, por ejemplo: el-cuyo.";
}
