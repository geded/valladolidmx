/**
 * Lote 3E — Categorías destacadas de la Home desde CMS (fuente única pública).
 *
 * Antes, la sección "Categorías" y el buscador del Hero partían de
 * `CATEGORIAS_MOCK`. Ahora comparten estas opciones de consulta: el loader
 * de la Home las precarga en SSR y cualquier componente las consume sin
 * duplicar la lectura ni recurrir a datos ficticios. Si el CMS no devuelve
 * categorías, el resultado es una lista vacía honesta.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { listHomeFeaturedCategories } from "@/lib/cms/public-reads.functions";

export const HOME_FEATURED_CATEGORIES_QUERY_KEY = ["home", "categorias", "featured"] as const;

export const homeFeaturedCategoriesQueryOptions = queryOptions({
  queryKey: HOME_FEATURED_CATEGORIES_QUERY_KEY,
  queryFn: () => listHomeFeaturedCategories(),
  staleTime: 5 * 60 * 1000,
  retry: false,
});

/** Categorías destacadas publicadas (CMS) para superficies públicas. */
export function useHomeFeaturedCategories() {
  return useQuery(homeFeaturedCategoriesQueryOptions);
}
