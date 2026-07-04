/**
 * Public reads for /oriente-maya/{slug} destination page.
 * Reads destinations enriched in DB (Fase 4.1b) and signs the hero image
 * from the private `demo-media` bucket. Falls back to null on miss so the
 * caller can use the static mock.
 */
import { createServerFn } from "@tanstack/react-start";
import type { MarketplaceBusinessCard, MarketplaceProductCard } from "@/lib/catalog/marketplace-reads.functions";
import type { PublicEventCard } from "@/lib/events/public-reads.functions";

export interface PublicDestinationDTO {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  highlights: string[];
  hero_palette: "territorio" | "selva" | "cenote" | "atardecer" | null;
  hero_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const getPublicDestinationBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PublicDestinationDTO | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const publishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row, error } = await sb
      .from("destinations")
      .select(
        "slug, name, tagline, description, highlights, hero_palette, latitude, longitude, hero_media_id, media_assets:hero_media_id ( storage_bucket, storage_path )",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("[getPublicDestinationBySlug] read error", error);
      return null;
    }
    if (!row) return null;

    let hero_url: string | null = null;
    const media = (row as unknown as {
      media_assets?: { storage_bucket: string; storage_path: string } | null;
    }).media_assets;
    if (media?.storage_bucket && media?.storage_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(media.storage_bucket)
        .createSignedUrl(media.storage_path, 60 * 60);
      if (signErr) console.error("[getPublicDestinationBySlug] sign error", signErr);
      hero_url = signed?.signedUrl ?? null;
    }

    return {
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? null,
      description: row.description ?? null,
      highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
      hero_palette: (row.hero_palette as PublicDestinationDTO["hero_palette"]) ?? null,
      hero_url,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    };
  });

export interface DestinationRelatedDTO {
  hoteles: MarketplaceBusinessCard[];
  restaurantes: MarketplaceBusinessCard[];
  experiencias: MarketplaceBusinessCard[];
  otras: MarketplaceBusinessCard[];
  productos: MarketplaceProductCard[];
  eventos: PublicEventCard[];
}

const HOTEL_CATS = new Set(["hoteles", "hospedaje"]);
const RESTO_CATS = new Set(["restaurantes", "gastronomia"]);
const EXP_CATS = new Set(["experiencias", "experiencias-tours", "tours"]);

/**
 * getDestinationRelated — Devuelve empresas y productos publicados
 * asociados a un destino, agrupados por categoría. Reutiliza el mismo
 * publishable client (anon + RLS) y proyecta sólo columnas seguras.
 * No introduce backend nuevo: consulta directa a `businesses`/`products`
 * con los mismos filtros públicos que `listMarketplaceBusinesses`.
 */
export const getDestinationRelated = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<DestinationRelatedDTO> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const empty: DestinationRelatedDTO = { hoteles: [], restaurantes: [], experiencias: [], otras: [], productos: [], eventos: [] };
    const { data: dest, error: dErr } = await sb
      .from("destinations").select("id, slug").eq("slug", data.slug).maybeSingle();
    if (dErr || !dest) return empty;

    const { data: biz, error: bErr } = await sb
      .from("businesses")
      .select("id, slug, display_name, tagline, verified, status, deleted_at, business_categories!businesses_primary_category_id_fkey ( slug )")
      .eq("destination_id", dest.id)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .limit(60);
    if (bErr) { console.error("[getDestinationRelated] biz", bErr); return empty; }

    const cards: MarketplaceBusinessCard[] = (biz ?? []).map((row) => {
      const cat = (row.business_categories as { slug?: unknown } | null)?.slug;
      return {
        id: row.id,
        slug: row.slug,
        display_name: row.display_name,
        tagline: row.tagline ?? "",
        verified: Boolean(row.verified),
        destination_slug: dest.slug,
        category_slug: typeof cat === "string" ? cat : "",
      };
    });
    const grouped: DestinationRelatedDTO = { hoteles: [], restaurantes: [], experiencias: [], otras: [], productos: [], eventos: [] };
    for (const c of cards) {
      if (HOTEL_CATS.has(c.category_slug)) grouped.hoteles.push(c);
      else if (RESTO_CATS.has(c.category_slug)) grouped.restaurantes.push(c);
      else if (EXP_CATS.has(c.category_slug)) grouped.experiencias.push(c);
      else grouped.otras.push(c);
    }

    const bizIds = cards.map((c) => c.id);
    if (bizIds.length > 0) {
      const { data: prods, error: pErr } = await sb
        .from("products")
        .select("id, slug, name, tagline, product_type, price_amount, price_currency, business_id, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level, status, deleted_at")
        .in("business_id", bizIds)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(24);
      if (!pErr && prods) {
        const bizById = new Map(cards.map((c) => [c.id, c] as const));
        grouped.productos = prods.map((p) => {
          const parent = bizById.get(p.business_id as string);
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            tagline: p.tagline ?? "",
            product_type: String(p.product_type),
            price_amount: p.price_amount,
            price_currency: p.price_currency,
            business_slug: parent?.slug ?? "",
            business_name: parent?.display_name ?? "",
            conversion_mode: String((p as Record<string, unknown>).conversion_mode ?? "informacion"),
            primary_action_label: ((p as Record<string, unknown>).primary_action_label as string | null) ?? null,
            secondary_action_mode: ((p as Record<string, unknown>).secondary_action_mode as string | null) ?? null,
            secondary_action_label: ((p as Record<string, unknown>).secondary_action_label as string | null) ?? null,
            accepts_online_payment: Boolean((p as Record<string, unknown>).accepts_online_payment),
            requires_availability: Boolean((p as Record<string, unknown>).requires_availability),
            visibility_level: String((p as Record<string, unknown>).visibility_level ?? "standard"),
          };
        });
      }
    }

    // Eventos próximos publicados asociados al destino.
    const { data: evs, error: eErr } = await sb
      .from("events")
      .select("id, slug, title, summary, starts_at, ends_at, venue_name, is_free, destination_id")
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("destination_id", dest.id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(6);
    if (!eErr && evs) {
      grouped.eventos = evs.map((e) => ({
        id: e.id as string,
        slug: e.slug as string,
        title: e.title as string,
        summary: (e.summary as string | null) ?? null,
        starts_at: e.starts_at as string,
        ends_at: (e.ends_at as string | null) ?? null,
        venue_name: (e.venue_name as string | null) ?? null,
        is_free: Boolean(e.is_free),
        destination_slug: dest.slug,
        cover_url: null,
      }));
    }
    return grouped;
  });
