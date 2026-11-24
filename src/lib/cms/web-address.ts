/**
 * Guardia de «Dirección web» (slug) para el CMS.
 *
 * La dirección web es el final de la dirección de una página
 * (p. ej. `el-cuyo`). Las páginas públicas sólo abren direcciones con
 * letras, números y guiones (la misma regla que aplica el resolver
 * territorial al abrir `/oriente-maya/:destino/:categoria/:empresa`).
 * Cualquier otra cosa —un enlace completo, un dominio con punto, un guion
 * bajo, espacios o signos— se guarda pero nunca abre, así que se rechaza
 * aquí con un aviso claro. Las mayúsculas se aceptan porque las rutas se
 * comparan en minúsculas.
 */
const ROUTE_SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/;

export function webAddressProblem(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const value = slug.trim();
  if (!value) return null;
  if (ROUTE_SLUG.test(value.toLowerCase())) return null;
  const looksLikeLink =
    /^(https?:)?\/\//i.test(value) || /^www\./i.test(value) || /\.[a-z]{2,}$/i.test(value);
  return looksLikeLink
    ? "La «Dirección web» no puede ser un enlace ni una página de internet. Escribe sólo el final de la dirección, en minúsculas y con guiones, por ejemplo: posada-san-jose."
    : "La «Dirección web» sólo puede llevar letras minúsculas, números y guiones (sin espacios, puntos, guion bajo ni signos), por ejemplo: posada-san-jose.";
}
