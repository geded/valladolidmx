/**
 * Inline Category Explorer — server fn público para el explorador
 * embebido en el micrositio de destino.
 *
 * Devuelve negocios publicados de un destino filtrados por categoría,
 * con paginación (offset/limit) y campos mínimos para tarjetas
 * compactas: id, slug, display_name, tagline, verified, latitude,
 * longitude, primary_address_line.
 *
 * El ordenamiento por distancia se hace en el cliente (Haversine) con
 * la ubicación del visitante — evita filtrado server-side sensible y
 * mantiene RLS TO anon sin cambios.
 */
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface InlineExplorerItem {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  verified: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  href: string;
}

export interface InlineExplorerDTO {
  items: InlineExplorerItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  destinationSlug: string;
  categorySlug: string;
}

interface Input {
  destinationSlug: string;
  categorySlug: string;
  page?: number;
  pageSize?: number;
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getInlineCategoryExplorer = createServerFn({ method: "GET" })
  .inputValidator((input: Input) => {
    if (!input?.destinationSlug || !/^[a-z0-9-]{1,80}$/.test(input.destinationSlug))
      throw new Error("invalid_destination_slug");
    if (!input?.categorySlug || !/^[a-z0-9-]{1,80}$/.test(input.categorySlug))
      throw new Error("invalid_category_slug");
    const page = Math.max(1, Math.min(50, Number(input.page ?? 1)));
    const pageSize = Math.max(1, Math.min(24, Number(input.pageSize ?? 8)));
    return {
      destinationSlug: input.destinationSlug,
      categorySlug: input.categorySlug,
      page,
      pageSize,
    };
  })
  .handler(async ({ data }): Promise<InlineExplorerDTO> => {
    const sb = publicClient();

    const { data: dest } = await sb
      .from("destinations")
      .select("id, slug")
      .eq("slug", data.destinationSlug)
      .maybeSingle();
    if (!dest) {
      return {
        items: [],
        totalCount: 0,
        page: data.page,
        pageSize: data.pageSize,
        destinationSlug: data.destinationSlug,
        categorySlug: data.categorySlug,
      };
    }

    const { data: cat } = await sb
      .from("business_categories")
      .select("id, slug")
      .eq("slug", data.categorySlug)
      .maybeSingle();
    if (!cat) {
      return {
        items: [],
        totalCount: 0,
        page: data.page,
        pageSize: data.pageSize,
        destinationSlug: data.destinationSlug,
        categorySlug: data.categorySlug,
      };
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: rows, count } = await sb
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, verified, business_locations!business_locations_business_id_fkey ( latitude, longitude, address_line1, is_primary )",
        { count: "exact" },
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("destination_id", (dest as { id: string }).id)
      .eq("primary_category_id", (cat as { id: string }).id)
      .order("verified", { ascending: false })
      .order("display_name", { ascending: true })
      .range(from, to);

    const items: InlineExplorerItem[] = (rows ?? []).map((r) => {
      const locs = ((r as { business_locations?: Array<{ latitude: number | null; longitude: number | null; address_line1: string | null; is_primary: boolean | null }> }).business_locations) ?? [];
      const primary = locs.find((l) => l?.is_primary) ?? locs[0] ?? null;
      return {
        id: String(r.id),
        slug: String(r.slug),
        display_name: String(r.display_name),
        tagline: (r.tagline as string | null) ?? "",
        verified: Boolean(r.verified),
        latitude: primary?.latitude != null ? Number(primary.latitude) : null,
        longitude: primary?.longitude != null ? Number(primary.longitude) : null,
        address: primary?.address_line1 ?? null,
        href: `/oriente-maya/${encodeURIComponent(data.destinationSlug)}/${encodeURIComponent(data.categorySlug)}/${encodeURIComponent(String(r.slug))}`,
      };
    });

    return {
      items,
      totalCount: count ?? items.length,
      page: data.page,
      pageSize: data.pageSize,
      destinationSlug: data.destinationSlug,
      categorySlug: data.categorySlug,
    };
  });

export function inlineExplorerQueryOptions(input: Input) {
  return queryOptions({
    queryKey: [
      "inline-explorer",
      input.destinationSlug,
      input.categorySlug,
      input.page ?? 1,
      input.pageSize ?? 8,
    ],
    queryFn: () => getInlineCategoryExplorer({ data: input }),
    staleTime: 60_000,
  });
}