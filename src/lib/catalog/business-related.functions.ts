/**
 * business-related.functions.ts — E2 · US-E2.1
 *
 * Related Collection para BusinessSurface. Devuelve empresas
 * hermanas publicadas en el MISMO destino:
 *   - `sameCategory`: misma categoría (excluye la empresa actual).
 *   - `sameDestinationOther`: otras categorías del mismo destino.
 *
 * Reglas (Roadmap 16.00 · Programa A/E · Carril A):
 *  - Server publishable client (anon, RLS TO anon aplica).
 *  - Sin escrituras, sin RPCs, sin acceso a datos privados del viajero.
 *  - Reutiliza el shape `MarketplaceBusinessCard`.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MarketplaceBusinessCard } from "./marketplace-reads.functions";
import { PUBLIC_BUSINESS_ELIGIBILITY_EQ } from "@/lib/omxds/public-eligibility";

export interface BusinessRelatedDTO {
  sameCategory: MarketplaceBusinessCard[];
  sameDestinationOther: MarketplaceBusinessCard[];
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const BUSINESS_SURFACE = "business-profile";

export const getBusinessRelated = createServerFn({ method: "GET" })
  .inputValidator((data: { businessId: string; destinationSlug: string; categorySlug: string }) => {
    if (!data || typeof data.businessId !== "string" || data.businessId.length === 0) {
      throw new Error("invalid_business_id");
    }
    if (typeof data.destinationSlug !== "string" || data.destinationSlug.length === 0) {
      throw new Error("invalid_destination_slug");
    }
    return {
      businessId: data.businessId,
      destinationSlug: data.destinationSlug,
      categorySlug: typeof data.categorySlug === "string" ? data.categorySlug : "",
    };
  })
  .handler(async ({ data }): Promise<BusinessRelatedDTO> => {
    const supabase = publicClient();
    // E6 · Related overrides (pin/hide) para esta ficha de empresa.
    const { data: overrides } = await supabase
      .from("related_overrides")
      .select("related_entity_type, related_entity_id, mode, position")
      .eq("entity_type", "business")
      .eq("entity_id", data.businessId)
      .eq("surface", BUSINESS_SURFACE)
      .eq("related_entity_type", "business");
    const hiddenIds = new Set<string>();
    const pinnedIds: string[] = [];
    for (const o of overrides ?? []) {
      if (o.mode === "hide") hiddenIds.add(o.related_entity_id as string);
      else if (o.mode === "pin") pinnedIds.push(o.related_entity_id as string);
    }

    const { data: rows, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      // G8-R1-F1I-R1 · DEF-F1I-001 — elegibilidad pública (autoridad única).
      .eq(...PUBLIC_BUSINESS_ELIGIBILITY_EQ)
      .order("display_name", { ascending: true })
      .limit(120);
    if (error) throw new Error(`business_related_failed: ${error.message}`);

    const all: MarketplaceBusinessCard[] = (rows ?? []).map((row) => {
      const dest = (row.destinations as { slug?: unknown } | null)?.slug;
      const cat = (row.business_categories as { slug?: unknown } | null)?.slug;
      return {
        id: row.id,
        slug: row.slug,
        display_name: row.display_name,
        tagline: row.tagline ?? "",
        verified: Boolean(row.verified),
        destination_slug: typeof dest === "string" ? dest : "",
        category_slug: typeof cat === "string" ? cat : "",
      };
    });

    const inDestination = all
      .filter((b) => b.destination_slug === data.destinationSlug && b.id !== data.businessId)
      .filter((b) => !hiddenIds.has(b.id));

    // Aplica pins: los items fijados se anteponen manteniendo su orden.
    const byId = new Map(all.map((b) => [b.id, b]));
    const pinnedCards: MarketplaceBusinessCard[] = [];
    for (const id of pinnedIds) {
      const c = byId.get(id);
      if (c && !hiddenIds.has(c.id)) pinnedCards.push(c);
    }
    const pinnedSet = new Set(pinnedCards.map((c) => c.id));

    const sameCategoryNatural = inDestination.filter(
      (b) => b.category_slug === data.categorySlug && !pinnedSet.has(b.id),
    );
    const sameDestinationOtherNatural = inDestination.filter(
      (b) => b.category_slug !== data.categorySlug && !pinnedSet.has(b.id),
    );

    const sameCategory = [
      ...pinnedCards.filter((c) => c.category_slug === data.categorySlug),
      ...sameCategoryNatural,
    ].slice(0, 6);
    const sameDestinationOther = [
      ...pinnedCards.filter((c) => c.category_slug !== data.categorySlug),
      ...sameDestinationOtherNatural,
    ].slice(0, 6);

    /* Portada canónica del CMS (`business_media` role=cover → `media_assets`).
       Misma vía que `listMarketplaceBusinesses`/`getDestinationRelated`: el
       bucket es privado y la URL se firma server-side. Best-effort: sin
       portada acreditada `cover_url` queda en null y la tarjeta compartida
       resuelve su marcador editorial aprobado. Nunca se inventa una imagen. */
    const shown = [...sameCategory, ...sameDestinationOther];
    if (shown.length > 0) {
      try {
        const { data: bmedia } = await supabase
          .from("business_media")
          .select(
            "business_id, role, sort_order, media_assets:media_assets ( storage_bucket, storage_path )",
          )
          .in(
            "business_id",
            shown.map((c) => c.id),
          )
          .eq("role", "cover")
          .order("sort_order", { ascending: true });
        if (bmedia && bmedia.length > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const seen = new Set<string>();
          const firstPerBusiness = (bmedia as Array<Record<string, unknown>>).filter((r) => {
            const bid = String(r.business_id);
            if (seen.has(bid)) return false;
            seen.add(bid);
            return true;
          });
          const signed = await Promise.all(
            firstPerBusiness.map(async (r) => {
              const asset = r.media_assets as {
                storage_bucket?: string;
                storage_path?: string;
              } | null;
              if (!asset?.storage_bucket || !asset?.storage_path)
                return [String(r.business_id), null] as const;
              const { data: s } = await supabaseAdmin.storage
                .from(asset.storage_bucket)
                .createSignedUrl(asset.storage_path, 3600);
              return [String(r.business_id), s?.signedUrl ?? null] as const;
            }),
          );
          const byBiz = new Map(signed);
          for (const card of shown) card.cover_url = byBiz.get(card.id) ?? null;
        }
      } catch (e) {
        console.warn("[getBusinessRelated] cover sign failed", e);
      }
    }

    return { sameCategory, sameDestinationOther };
  });
