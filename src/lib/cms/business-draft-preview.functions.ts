/**
 * G8-R1-F1B-B3 · Lectura staff de borradores empresariales para el
 * Preview Interno (`/cms/empresas/{id}/preview`).
 *
 * Reglas:
 *  · `requireSupabaseAuth` + verificación explícita de rol editorial.
 *  · RLS aplica como el usuario: ningún público alcanza un `draft`.
 *  · Devuelve EXACTAMENTE la forma `MarketplaceBusinessDetail` que consume
 *    la superficie productiva `BusinessSurface`: cero renderer paralelo,
 *    cero fixture, cero adaptador alterno.
 *  · Sólo lectura. Nunca publica, aprueba ni modifica el flag.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MarketplaceBusinessDetail } from "@/lib/catalog/marketplace-reads.functions";
import { resolveBusinessPlanTier } from "@/lib/plans/plans-catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

async function assertEditorialStaff(context: Ctx) {
  const editorial = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (editorial.error) throw new Error(`role_check_failed: ${editorial.error.message}`);
  if (editorial.data !== true) throw new Error("forbidden");
}

export type BusinessDraftPreview = {
  business: MarketplaceBusinessDetail;
  /** Diagnóstico editorial interno — nunca se expone en superficie pública. */
  review: {
    status: string;
    sourceReviewState: string | null;
    recordOrigin: string | null;
    coordinatesState: string | null;
    coordinatesPrecision: string | null;
    coordinatesAttribution: string | null;
    seoDraft: Record<string, string> | null;
    noindex: true;
  };
};

export const getBusinessDraftPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    const id = input?.businessId ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_business_id");
    return { businessId: id };
  })
  .handler(async ({ data, context }): Promise<BusinessDraftPreview | null> => {
    await assertEditorialStaff(context as Ctx);
    const supabase = (context as Ctx).supabase;

    const { data: biz, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, description, verified, status, deleted_at, metadata, " +
          "record_origin, source_review_state, " +
          "destinations!businesses_destination_id_fkey ( slug ), " +
          "business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("id", data.businessId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`draft_preview_failed: ${error.message}`);
    if (!biz) return null;

    const [{ data: locations }, { data: contacts }, { data: products }] = await Promise.all([
      supabase
        .from("business_locations")
        .select("label, address_line1, address_line2, latitude, longitude, metadata, is_primary")
        .eq("business_id", biz.id)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1),
      supabase
        .from("business_contacts")
        .select("type, value, label, is_primary")
        .eq("business_id", biz.id)
        .order("is_primary", { ascending: false })
        .limit(1),
      supabase
        .from("products")
        .select("id, slug, name, tagline, product_type, price_amount, price_currency")
        .eq("business_id", biz.id)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(24),
    ]);

    const loc = (locations ?? [])[0] ?? null;
    const contact = (contacts ?? [])[0] ?? null;
    const meta = (biz.metadata ?? {}) as Record<string, unknown>;
    const locMeta = (loc?.metadata ?? {}) as Record<string, unknown>;

    const business: MarketplaceBusinessDetail = {
      id: biz.id,
      slug: biz.slug,
      display_name: biz.display_name,
      tagline: biz.tagline ?? "",
      description: biz.description ?? "",
      destination_slug: (biz.destinations as { slug?: string } | null)?.slug ?? "",
      category_slug: (biz.business_categories as { slug?: string } | null)?.slug ?? "",
      verified: Boolean(biz.verified),
      plan_tier: resolveBusinessPlanTier(meta ?? null),
      cover_url: null,
      latitude: loc?.latitude !== null && loc?.latitude !== undefined ? Number(loc.latitude) : null,
      longitude:
        loc?.longitude !== null && loc?.longitude !== undefined ? Number(loc.longitude) : null,
      address_line1: loc?.address_line1 ?? null,
      primary_location: loc
        ? {
            label: loc.label ?? null,
            address_line1: loc.address_line1 ?? null,
            address_line2: loc.address_line2 ?? null,
            latitude: loc.latitude !== null ? Number(loc.latitude) : null,
            longitude: loc.longitude !== null ? Number(loc.longitude) : null,
          }
        : null,
      primary_contact: contact
        ? { type: String(contact.type), value: String(contact.value), label: contact.label ?? null }
        : null,
      provenance: "published",
      products: (products ?? []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        product_type: String(p.product_type),
        price_amount: p.price_amount,
        price_currency: p.price_currency,
        business_slug: biz.slug,
        business_name: biz.display_name,
        conversion_mode: "informacion",
        primary_action_label: null,
        secondary_action_mode: null,
        secondary_action_label: null,
        accepts_online_payment: false,
        requires_availability: false,
        visibility_level: "standard",
      })),
      promotions: [],
    };

    return {
      business,
      review: {
        status: String(biz.status),
        sourceReviewState: biz.source_review_state ?? null,
        recordOrigin: biz.record_origin ?? null,
        coordinatesState: (locMeta.coordinates as string | undefined) ?? null,
        coordinatesPrecision: (locMeta.coordinates_precision as string | undefined) ?? null,
        coordinatesAttribution: (locMeta.coordinates_attribution as string | undefined) ?? null,
        seoDraft: meta.seo_draft
          ? Object.fromEntries(
              Object.entries(meta.seo_draft as Record<string, unknown>).map(([k, v]) => [
                k,
                typeof v === "string" ? v : JSON.stringify(v),
              ]),
            )
          : null,
        noindex: true,
      },
    };
  });
