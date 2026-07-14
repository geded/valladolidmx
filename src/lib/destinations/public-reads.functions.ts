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

/* ------------------------------------------------------------------ *
 * U-VISUAL · V4.2 — Datos para el bloque `vmx.experience.map` en la
 * superficie de destino. Se lee `business_locations` de todos los
 * negocios publicados asociados al destino y se proyectan como puntos
 * territoriales. Compatibilidad Evolutiva: función nueva, no modifica
 * `getDestinationRelated`.
 * ------------------------------------------------------------------ */
export interface DestinationMapPointDTO {
  id: string;
  kind: "business";
  lat: number;
  lng: number;
  title: string;
  subtitle: string | null;
  href: string | null;
  thumbUrl: string | null;
  badge: string | null;
  priceLabel: string | null;
}

export const getDestinationMapPoints = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<DestinationMapPointDTO[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // H2·P1 — Un solo roundtrip: filtramos por `destinations.slug` vía
    // inner join en lugar de resolver `destination_id` en dos pasos.
    const { data: rows, error } = await sb
      .from("businesses")
      .select("id, slug, display_name, tagline, status, deleted_at, business_locations!inner(latitude, longitude, address_line1, is_primary), destinations!inner(slug)")
      .eq("destinations.slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(80);
    if (error || !rows) return [];
    const points: DestinationMapPointDTO[] = [];
    for (const row of rows) {
      const locs = (row.business_locations ?? []) as Array<{
        latitude: number | null;
        longitude: number | null;
        address_line1: string | null;
        is_primary: boolean | null;
      }>;
      const primary = locs.find((l) => l.is_primary) ?? locs[0];
      if (!primary || primary.latitude == null || primary.longitude == null) continue;
      points.push({
        id: row.id as string,
        kind: "business",
        lat: Number(primary.latitude),
        lng: Number(primary.longitude),
        title: (row.display_name as string) ?? "",
        subtitle: primary.address_line1 ?? (row.tagline as string | null) ?? null,
        href: `/negocio/${row.slug}`,
        thumbUrl: null,
        badge: null,
        priceLabel: null,
      });
    }
    return points;
  });

/* ------------------------------------------------------------------ *
 * U-VISUAL · V4.2 — Galería del destino (Airbnb-style). Lee
 * `destination_media` firmando URLs desde el bucket privado.
 * ------------------------------------------------------------------ */
export const getDestinationGalleryUrls = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<string[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // H2·P1 — Un solo roundtrip vía inner-join sobre `destinations.slug`.
    const { data: rows, error } = await sb
      .from("destination_media")
      .select("sort_order, media_assets:media_asset_id ( storage_bucket, storage_path ), destinations!inner(slug)")
      .eq("destinations.slug", data.slug)
      .order("sort_order", { ascending: true })
      .limit(12);
    if (error || !rows) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // H2·P1 — Firma en paralelo. Antes: N storage.createSignedUrl
    // secuenciales; hoy: una sola oleada Promise.all.
    const signed = await Promise.all(
      rows.map(async (r) => {
        const m = (r as unknown as {
          media_assets?: { storage_bucket: string; storage_path: string } | null;
        }).media_assets;
        if (!m?.storage_bucket || !m?.storage_path) return null;
        const { data: s } = await supabaseAdmin.storage
          .from(m.storage_bucket)
          .createSignedUrl(m.storage_path, 60 * 60);
        return s?.signedUrl ?? null;
      }),
    );
    return signed.filter((u): u is string => Boolean(u));
  });

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

    // E6 · Overrides (pin/hide) para la ficha de destino.
    const { data: overridesRows } = await sb
      .from("related_overrides")
      .select("related_entity_type, related_entity_id, mode")
      .eq("entity_type", "destination")
      .eq("entity_id", dest.id)
      .eq("surface", "destination-detail");
    const hidden = {
      business: new Set<string>(),
      product: new Set<string>(),
      event: new Set<string>(),
    };
    const pinnedIds = {
      business: [] as string[],
      product: [] as string[],
      event: [] as string[],
    };
    for (const o of overridesRows ?? []) {
      const t = o.related_entity_type as "business" | "product" | "event" | "destination";
      if (t === "destination") continue;
      if (o.mode === "hide") hidden[t].add(o.related_entity_id as string);
      else if (o.mode === "pin") pinnedIds[t].push(o.related_entity_id as string);
    }

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
    }).filter((c) => !hidden.business.has(c.id));
    const grouped: DestinationRelatedDTO = { hoteles: [], restaurantes: [], experiencias: [], otras: [], productos: [], eventos: [] };
    const bizById = new Map(cards.map((c) => [c.id, c] as const));
    for (const c of cards) {
      if (HOTEL_CATS.has(c.category_slug)) grouped.hoteles.push(c);
      else if (RESTO_CATS.has(c.category_slug)) grouped.restaurantes.push(c);
      else if (EXP_CATS.has(c.category_slug)) grouped.experiencias.push(c);
      else grouped.otras.push(c);
    }
    // Pins de empresa → prepend a `otras` (categoría agnóstica en superficie destino).
    if (pinnedIds.business.length > 0) {
      const pinnedBiz: MarketplaceBusinessCard[] = [];
      const pinnedSet = new Set<string>();
      for (const id of pinnedIds.business) {
        const c = bizById.get(id);
        if (c && !pinnedSet.has(id)) { pinnedBiz.push(c); pinnedSet.add(id); }
      }
      if (pinnedBiz.length > 0) {
        grouped.otras = [
          ...pinnedBiz,
          ...grouped.otras.filter((c) => !pinnedSet.has(c.id)),
        ];
      }
    }

    const bizIds = cards.map((c) => c.id);
    // Covers de empresas (business_media role=cover).
    if (bizIds.length > 0) {
      const { data: bmedia } = await sb
        .from("business_media")
        .select("business_id, role, sort_order, media_assets:media_assets ( storage_bucket, storage_path )")
        .in("business_id", bizIds)
        .eq("role", "cover")
        .order("sort_order", { ascending: true });
      if (bmedia && bmedia.length > 0) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const seen = new Set<string>();
          const first = bmedia.filter((r) => {
            const bid = r.business_id as string;
            if (seen.has(bid)) return false;
            seen.add(bid);
            return true;
          });
          const signed = await Promise.all(
            first.map(async (r) => {
              const a = (r as unknown as { media_assets?: { storage_bucket: string; storage_path: string } | null }).media_assets;
              if (!a) return { id: r.business_id as string, url: null as string | null };
              const { data: s } = await supabaseAdmin.storage
                .from(a.storage_bucket)
                .createSignedUrl(a.storage_path, 3600);
              return { id: r.business_id as string, url: s?.signedUrl ?? null };
            }),
          );
          const byBiz = new Map(signed.map((x) => [x.id, x.url] as const));
          const patchCover = (c: MarketplaceBusinessCard) => ({ ...c, cover_url: byBiz.get(c.id) ?? null });
          grouped.hoteles = grouped.hoteles.map(patchCover);
          grouped.restaurantes = grouped.restaurantes.map(patchCover);
          grouped.experiencias = grouped.experiencias.map(patchCover);
          grouped.otras = grouped.otras.map(patchCover);
          for (const [bid, url] of byBiz) bizById.set(bid, { ...(bizById.get(bid) as MarketplaceBusinessCard), cover_url: url });
        } catch (e) {
          console.warn("[getDestinationRelated] biz cover sign failed", e);
        }
      }
    }

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
        grouped.productos = prods.filter((p) => !hidden.product.has(p.id as string)).map((p) => {
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
            cover_url: null,
          };
        });
        // Covers de productos (product_media role=cover) + fallback a la portada del negocio.
        const prodIds = grouped.productos.map((p) => p.id);
        if (prodIds.length > 0) {
          const { data: pmedia } = await sb
            .from("product_media")
            .select("product_id, role, sort_order, media_assets:media_assets ( storage_bucket, storage_path )")
            .in("product_id", prodIds)
            .eq("role", "cover")
            .order("sort_order", { ascending: true });
          const byProd = new Map<string, string | null>();
          if (pmedia && pmedia.length > 0) {
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const seen = new Set<string>();
              const first = pmedia.filter((r) => {
                const pid = r.product_id as string;
                if (seen.has(pid)) return false;
                seen.add(pid);
                return true;
              });
              const signed = await Promise.all(
                first.map(async (r) => {
                  const a = (r as unknown as { media_assets?: { storage_bucket: string; storage_path: string } | null }).media_assets;
                  if (!a) return { id: r.product_id as string, url: null as string | null };
                  const { data: s } = await supabaseAdmin.storage
                    .from(a.storage_bucket)
                    .createSignedUrl(a.storage_path, 3600);
                  return { id: r.product_id as string, url: s?.signedUrl ?? null };
                }),
              );
              for (const { id, url } of signed) byProd.set(id, url);
            } catch (e) {
              console.warn("[getDestinationRelated] product cover sign failed", e);
            }
          }
          grouped.productos = grouped.productos.map((p) => {
            const own = byProd.get(p.id) ?? null;
            if (own) return { ...p, cover_url: own };
            // Fallback: usar la portada del negocio dueño.
            const parent = grouped.hoteles.concat(grouped.restaurantes, grouped.experiencias, grouped.otras)
              .find((b) => b.slug === p.business_slug);
            return { ...p, cover_url: parent?.cover_url ?? null };
          });
        }
        if (pinnedIds.product.length > 0) {
          const byId = new Map(grouped.productos.map((c) => [c.id, c] as const));
          const pinnedCards = pinnedIds.product.map((id) => byId.get(id)).filter(Boolean) as typeof grouped.productos;
          const pinnedSet = new Set(pinnedCards.map((c) => c.id));
          grouped.productos = [
            ...pinnedCards,
            ...grouped.productos.filter((c) => !pinnedSet.has(c.id)),
          ];
        }
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
      grouped.eventos = evs.filter((e) => !hidden.event.has(e.id as string)).map((e) => ({
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
      if (pinnedIds.event.length > 0) {
        const byId = new Map(grouped.eventos.map((c) => [c.id, c] as const));
        const pinnedCards = pinnedIds.event.map((id) => byId.get(id)).filter(Boolean) as typeof grouped.eventos;
        const pinnedSet = new Set(pinnedCards.map((c) => c.id));
        grouped.eventos = [
          ...pinnedCards,
          ...grouped.eventos.filter((c) => !pinnedSet.has(c.id)),
        ];
      }
    }
    return grouped;
  });
