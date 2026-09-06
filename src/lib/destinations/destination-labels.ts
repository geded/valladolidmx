/**
 * Lote 3B — Etiquetas de destino desde CMS (fuente única pública).
 *
 * Las rutas públicas de categoría (hoteles, restaurantes, experiencias,
 * eventos, lugares, casas de vacaciones…) necesitan el nombre legible de
 * un destino para breadcrumbs y contexto. Antes lo resolvían contra el
 * fixture `DESTINOS_MOCK`; ahora lo leen de los destinos publicados en
 * Lovable Cloud. Si el destino no existe todavía en CMS, el fallback es
 * el propio slug humanizado — nunca un nombre inventado.
 */
import { useCallback } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import type { Destination } from "@/types/territory";

/** Fallback seguro: el slug con espacios, sin inventar contenido. */
export function humanizeDestinationSlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** Resolución sincrónica contra una lista ya cargada. */
export function resolveDestinationLabel(
  destinations: readonly Destination[] | undefined,
  slug: string,
): string {
  return destinations?.find((d) => d.slug === slug)?.name ?? humanizeDestinationSlug(slug);
}

export const PUBLISHED_DESTINATIONS_QUERY_KEY = ["public", "destinations", "published"] as const;

/**
 * Opciones compartidas: permiten precargar en el loader (SSR) y consumir
 * desde cualquier componente sin duplicar la lectura.
 */
export const publishedDestinationsQueryOptions = queryOptions({
  queryKey: PUBLISHED_DESTINATIONS_QUERY_KEY,
  queryFn: () => listPublishedDestinations(),
  staleTime: 5 * 60 * 1000,
  retry: false,
});

/** Destinos publicados (CMS) para superficies públicas. */
export function usePublishedDestinations() {
  return useQuery(publishedDestinationsQueryOptions);
}

/**
 * Devuelve una función estable `(slug) => nombre` basada en los destinos
 * publicados, con fallback al slug humanizado mientras carga o si el
 * destino no está publicado.
 */
export function useDestinationLabel(): (slug: string) => string {
  const { data } = usePublishedDestinations();
  return useCallback((slug: string) => resolveDestinationLabel(data, slug), [data]);
}
