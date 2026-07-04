/**
 * H-02 · Iniciativa 2 — Discovery Navigator
 *
 * Server function que resuelve dinámicamente las categorías disponibles
 * de un destino/región y sus conteos de negocios publicados. Alimenta
 * el bloque oficial `vmx.discovery.navigator` del Experience Builder.
 *
 * Contrato de retorno estable — pensado para evolucionar (promociones,
 * eventos, experiencias destacadas, Alux) sin romper compatibilidad:
 * el bloque agregará campos nuevos, nunca renombrará los actuales.
 */
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export interface DiscoveryCategoryItem {
  /** Slug canónico de la categoría (business_categories.slug). */
  slug: string;
  /** Nombre visible en el idioma base (fallback: slug). */
  label: string;
  /** Icono Lucide recomendado — sólo referencia; el UI decide. */
  iconKey: string;
  /** Número de negocios publicados de esta categoría en el scope. */
  count: number;
  /** Href canónico ya resuelto (mantiene el destino activo). */
  href: string;
}

export interface DiscoveryNavigatorDTO {
  scope: {
    kind: "destination" | "region" | "global";
    slug: string | null;
    label: string | null;
  };
  categories: DiscoveryCategoryItem[];
  /**
   * Reservado para evolución futura sin cambiar el contrato:
   * promociones, eventos, experiencias destacadas, rutas, Alux, campañas.
   * Vacío en esta ola. Los items serán objetos JSON serializables.
   */
  extensions: Array<{ kind: string; items: Array<Record<string, string | number | boolean | null>> }>;
}

/** Slugs de categoría que tienen ruta pública propia. */
const CATEGORY_ROUTE_MAP: Record<string, string> = {
  hoteles: "/hoteles",
  hospedaje: "/hoteles",
  restaurantes: "/restaurantes",
  gastronomia: "/restaurantes",
  experiencias: "/experiencias",
  "experiencias-tours": "/experiencias",
  tours: "/experiencias",
  "casas-de-vacaciones": "/casas-de-vacaciones",
  "que-hacer": "/que-hacer",
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  hoteles: "bed-double",
  hospedaje: "bed-double",
  restaurantes: "utensils",
  gastronomia: "utensils",
  experiencias: "compass",
  "experiencias-tours": "compass",
  tours: "compass",
  "casas-de-vacaciones": "home",
  "que-hacer": "binoculars",
  eventos: "calendar-days",
};

function categoryHref(slug: string, destinationSlug: string | null): string {
  const route = CATEGORY_ROUTE_MAP[slug];
  const qs = destinationSlug ? `?destino=${encodeURIComponent(destinationSlug)}` : "";
  if (route) return `${route}${qs}`;
  // Fallback: marketplace filtrado por categoría (mantiene contexto territorial).
  const params = new URLSearchParams();
  if (destinationSlug) params.set("destino", destinationSlug);
  params.set("categoria", slug);
  return `/marketplace/buscar?${params.toString()}`;
}

interface Input {
  destinationSlug?: string | null;
  regionSlug?: string | null;
}

export const getDiscoveryNavigator = createServerFn({ method: "GET" })
  .inputValidator((input: Input) => {
    const dest = input?.destinationSlug ?? null;
    const region = input?.regionSlug ?? null;
    if (dest && !/^[a-z0-9-]{1,80}$/.test(dest)) throw new Error("Invalid destinationSlug");
    if (region && !/^[a-z0-9-]{1,80}$/.test(region)) throw new Error("Invalid regionSlug");
    return { destinationSlug: dest, regionSlug: region };
  })
  .handler(async ({ data }): Promise<DiscoveryNavigatorDTO> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Resolver scope
    let scopeKind: DiscoveryNavigatorDTO["scope"]["kind"] = "global";
    let scopeSlug: string | null = null;
    let scopeLabel: string | null = null;
    let destinationId: string | null = null;
    let regionId: string | null = null;

    if (data.destinationSlug) {
      const { data: dest } = await sb
        .from("destinations")
        .select("id, slug, name")
        .eq("slug", data.destinationSlug)
        .maybeSingle();
      if (dest) {
        destinationId = dest.id as string;
        scopeKind = "destination";
        scopeSlug = dest.slug as string;
        scopeLabel = dest.name as string;
      }
    } else if (data.regionSlug) {
      const { data: region } = await sb
        .from("tourism_regions")
        .select("id, slug, name")
        .eq("slug", data.regionSlug)
        .maybeSingle();
      if (region) {
        regionId = region.id as string;
        scopeKind = "region";
        scopeSlug = region.slug as string;
        scopeLabel = region.name as string;
      }
    }

    // Pull published businesses in scope with their primary category.
    let query = sb
      .from("businesses")
      .select(
        "id, business_categories!businesses_primary_category_id_fkey ( slug, name )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(2000);

    if (destinationId) {
      query = query.eq("destination_id", destinationId);
    } else if (regionId) {
      // Los destinos exponen region_id (Fase 4.1b). Filtramos vía subquery lite.
      const { data: dests } = await sb
        .from("destinations")
        .select("id")
        .eq("region_id", regionId);
      const ids = (dests ?? []).map((d) => d.id as string);
      if (ids.length === 0) {
        return { scope: { kind: scopeKind, slug: scopeSlug, label: scopeLabel }, categories: [], extensions: [] };
      }
      query = query.in("destination_id", ids);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[getDiscoveryNavigator] read error", error);
      return { scope: { kind: scopeKind, slug: scopeSlug, label: scopeLabel }, categories: [], extensions: [] };
    }

    // Aggregate by category slug (fallback: 'sin-categoria').
    const acc = new Map<string, { slug: string; label: string; count: number }>();
    for (const r of rows ?? []) {
      const cat = (r as { business_categories?: { slug?: unknown; name?: unknown } | null })
        .business_categories;
      const slug = typeof cat?.slug === "string" && cat.slug ? cat.slug : "sin-categoria";
      const label = typeof cat?.name === "string" && cat.name ? cat.name : slug;
      const entry = acc.get(slug) ?? { slug, label, count: 0 };
      entry.count += 1;
      acc.set(slug, entry);
    }

    const categories: DiscoveryCategoryItem[] = Array.from(acc.values())
      .filter((c) => c.slug !== "sin-categoria" || c.count > 0)
      .map((c) => ({
        slug: c.slug,
        label: c.label,
        iconKey: CATEGORY_ICON_MAP[c.slug] ?? "layers",
        count: c.count,
        href: categoryHref(c.slug, scopeKind === "destination" ? scopeSlug : null),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      scope: { kind: scopeKind, slug: scopeSlug, label: scopeLabel },
      categories,
      extensions: [],
    };
  });

export function discoveryNavigatorQueryOptions(input: Input) {
  const key = ["discovery-navigator", input.destinationSlug ?? null, input.regionSlug ?? null];
  return queryOptions({
    queryKey: key,
    queryFn: () => getDiscoveryNavigator({ data: input }),
    staleTime: 60_000,
  });
}