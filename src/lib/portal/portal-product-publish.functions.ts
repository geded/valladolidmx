/**
 * portal/portal-product-publish.functions.ts — Sub-ola 2.4a · Fase C + D.
 *
 * Contiene:
 *  - `getPortalProductPublishSnapshot`: alimenta el checklist de
 *    publicación con el snapshot que consume `ProductPublishValidator`.
 *  - `publishPortalProduct` / `unpublishPortalProduct`: RPCs SECURITY
 *    DEFINER que aplican reglas duras + gate híbrido (verified /
 *    can_self_publish).
 *  - `getPortalProductPreview`: lectura autenticada de la ficha de
 *    producto independientemente del status. Reutiliza el mismo
 *    contrato `MarketplaceProductDetail` que consume ProductSurface,
 *    para renderizar el preview con los mismos bloques
 *    `vmx.product.*` — sin cambios a CompositionRenderer ni al
 *    preview-registry.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MarketplaceProductDetail } from "@/lib/marketplace/marketplace-reads.functions";
import { resolveBusinessPlanTier } from "@/lib/plans/plans-catalog";
import {
  ProductPublishValidator,
  runPublishChecks,
  type ProductPublishSnapshot,
  type PublishCheckResult,
} from "@/lib/portal/publish-validators";

// ─────────────── Snapshot para checklist ───────────────

export const getPortalProductPublishSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{
      snapshot: ProductPublishSnapshot;
      check: PublishCheckResult;
    }> => {
      const { supabase, userId } = context;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpc = supabase.rpc as any;
      const { data: prod, error: pErr } = await supabase
        .from("products")
        .select(
          "id, business_id, product_type, name, slug, description, price_amount, cover_media_id",
        )
        .eq("id", data.productId)
        .is("deleted_at", null)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!prod) throw new Error("product_not_found");
      const { data: ok } = await rpc("has_business_access", {
        _user_id: userId,
        _business_id: prod.business_id,
        _min_role: "viewer",
      });
      if (!ok) throw new Error("forbidden");

      const [{ data: biz }, { data: media }, { count: faqCount }] =
        await Promise.all([
          supabase
            .from("businesses")
            .select("verified, can_self_publish, status")
            .eq("id", prod.business_id)
            .maybeSingle(),
          supabase
            .from("product_media")
            .select("id, role")
            .eq("product_id", data.productId),
          supabase
            .from("faqs")
            .select("id", { count: "exact", head: true })
            .eq("entity_kind", "product")
            .eq("entity_id", data.productId)
            .eq("status", "published")
            .is("deleted_at", null),
        ]);

      const mediaRows = (media ?? []) as Array<{ id: string; role: string }>;
      const hasCoverRow = mediaRows.some((m) => m.role === "cover");
      const galleryCount = mediaRows.filter((m) => m.role === "gallery").length;

      const snapshot: ProductPublishSnapshot = {
        productType: String(prod.product_type),
        name: prod.name as string | null,
        slug: prod.slug as string | null,
        description: prod.description as string | null,
        price_amount:
          prod.price_amount !== null && prod.price_amount !== undefined
            ? Number(prod.price_amount)
            : null,
        hasCover: hasCoverRow || Boolean(prod.cover_media_id),
        galleryCount,
        faqCount: Number(faqCount ?? 0),
        businessVerified: Boolean(biz?.verified),
        businessCanSelfPublish: Boolean(biz?.can_self_publish),
        businessPublished: biz?.status === "published",
      };
      return {
        snapshot,
        check: runPublishChecks(ProductPublishValidator.kind, snapshot),
      };
    },
  );

// ─────────────── Publish / Unpublish ───────────────

export const publishPortalProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{
      published: boolean;
      reason?: string;
      message?: string;
      errors?: string[];
    }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (context.supabase.rpc as any)(
        "publish_business_product",
        { _product_id: data.productId },
      );
      if (error) throw new Error(error.message);
      return result as {
        published: boolean;
        reason?: string;
        message?: string;
        errors?: string[];
      };
    },
  );

export const unpublishPortalProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.rpc as any)(
      "unpublish_business_product",
      { _product_id: data.productId },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─────────────── Preview autenticado ───────────────

/**
 * Devuelve el mismo shape `MarketplaceProductDetail` que consume
 * `ProductSurface` en producción, pero sin filtrar por `status`. Requiere
 * `has_business_access('viewer')` de la empresa dueña. Firma URLs con
 * `supabaseAdmin` cargado dentro del handler.
 */
export const getPortalProductPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<MarketplaceProductDetail | null> => {
    const { supabase, userId } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = supabase.rpc as any;

    const { data: prod, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, tagline, description, product_type, price_amount, price_currency, status, business_id, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level",
      )
      .eq("id", data.productId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prod) return null;

    const { data: ok } = await rpc("has_business_access", {
      _user_id: userId,
      _business_id: prod.business_id,
      _min_role: "viewer",
    });
    if (!ok) throw new Error("forbidden");

    const [
      { data: biz },
      { data: mediaRows },
      { data: contacts },
      { data: locations },
      { data: promos },
      { data: reviews },
      { data: faqs },
      { data: relatedRows },
    ] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, slug, display_name, tagline, verified, status, metadata, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
        )
        .eq("id", prod.business_id)
        .maybeSingle(),
      supabase
        .from("product_media")
        .select(
          "id, role, sort_order, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
        )
        .eq("product_id", prod.id)
        .order("sort_order", { ascending: true })
        .limit(24),
      supabase
        .from("business_contacts")
        .select("contact_type, value, label, is_public, sort_order")
        .eq("business_id", prod.business_id)
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .limit(4),
      supabase
        .from("business_locations")
        .select("label, address_line1, address_line2, latitude, longitude, is_primary")
        .eq("business_id", prod.business_id)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1),
      supabase
        .from("promotions")
        .select("id, slug, title, description, discount_percent, starts_at, ends_at, status")
        .eq("business_id", prod.business_id)
        .is("deleted_at", null)
        .order("ends_at", { ascending: true, nullsFirst: false })
        .limit(6),
      supabase
        .from("reviews")
        .select("id, author_display_name, rating, title, body, published_at, status, subject_kind, subject_id")
        .eq("subject_kind", "product")
        .eq("subject_id", prod.id)
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(6),
      supabase
        .from("faqs")
        .select("id, question, answer, position, status, entity_kind, entity_id, locale")
        .eq("entity_kind", "product")
        .eq("entity_id", prod.id)
        .is("deleted_at", null)
        .order("position", { ascending: true })
        .limit(12),
      supabase
        .from("products")
        .select(
          "id, slug, name, tagline, product_type, price_amount, price_currency, status, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level",
        )
        .eq("business_id", prod.business_id)
        .is("deleted_at", null)
        .neq("id", prod.id)
        .order("name", { ascending: true })
        .limit(6),
    ]);

    if (!biz) return null;

    // Signed URLs (bucket privado). Best-effort.
    type MediaItem = MarketplaceProductDetail["media"][number];
    let media: MediaItem[] = [];
    const rows = (mediaRows ?? []) as Array<{
      id: string;
      role: string;
      sort_order: number | null;
      media_assets: {
        id: string;
        storage_bucket: string;
        storage_path: string;
        alt_text: string | null;
        width: number | null;
        height: number | null;
      } | null;
    }>;
    if (rows.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const signed = await Promise.all(
          rows.map(async (r) => {
            const a = r.media_assets;
            if (!a) return { row: r, url: null as string | null };
            const { data: s } = await supabaseAdmin.storage
              .from(a.storage_bucket)
              .createSignedUrl(a.storage_path, 3600);
            return { row: r, url: s?.signedUrl ?? null };
          }),
        );
        media = signed.map(({ row, url }) => ({
          id: row.id,
          role: row.role,
          url,
          alt: row.media_assets?.alt_text ?? null,
          width: row.media_assets?.width ?? null,
          height: row.media_assets?.height ?? null,
          sort_order: Number(row.sort_order ?? 0),
        }));
      } catch {
        media = rows.map((r) => ({
          id: r.id,
          role: r.role,
          url: null,
          alt: r.media_assets?.alt_text ?? null,
          width: r.media_assets?.width ?? null,
          height: r.media_assets?.height ?? null,
          sort_order: Number(r.sort_order ?? 0),
        }));
      }
    }

    const cover = media.find((m) => m.role === "cover") ?? media[0] ?? null;
    const destSlug = (biz.destinations as { slug?: unknown } | null)?.slug;
    const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;
    const planTier = resolveBusinessPlanTier(
      (biz as { metadata?: Record<string, unknown> | null }).metadata ?? null,
    );
    const contactRows = (contacts ?? []) as Array<{
      contact_type: string;
      value: string;
      label: string | null;
    }>;
    const primaryContact = contactRows[0]
      ? {
          type: contactRows[0].contact_type,
          value: contactRows[0].value,
          label: contactRows[0].label,
        }
      : null;
    const locRow = ((locations ?? []) as Array<{
      label: string | null;
      address_line1: string | null;
      address_line2: string | null;
      latitude: number | string | null;
      longitude: number | string | null;
    }>)[0];
    const primaryLocation = locRow
      ? {
          label: locRow.label,
          address_line1: locRow.address_line1,
          address_line2: locRow.address_line2,
          latitude: locRow.latitude !== null ? Number(locRow.latitude) : null,
          longitude: locRow.longitude !== null ? Number(locRow.longitude) : null,
        }
      : null;

    const related: MarketplaceProductDetail["related"] = (
      (relatedRows ?? []) as Array<Record<string, unknown>>
    ).map((p) => ({
      id: String(p.id),
      slug: String(p.slug),
      name: String(p.name),
      tagline: (p.tagline as string) ?? "",
      product_type: String(p.product_type),
      price_amount:
        p.price_amount !== null && p.price_amount !== undefined
          ? Number(p.price_amount)
          : null,
      price_currency: String(p.price_currency ?? "MXN"),
      business_slug: biz.slug as string,
      business_name: biz.display_name as string,
      conversion_mode: String(p.conversion_mode ?? "informacion"),
      primary_action_label: (p.primary_action_label as string | null) ?? null,
      secondary_action_mode: (p.secondary_action_mode as string | null) ?? null,
      secondary_action_label: (p.secondary_action_label as string | null) ?? null,
      accepts_online_payment: Boolean(p.accepts_online_payment),
      requires_availability: Boolean(p.requires_availability),
      visibility_level: String(p.visibility_level ?? "standard"),
    }));

    return {
      id: prod.id,
      slug: prod.slug,
      name: prod.name,
      tagline: prod.tagline ?? "",
      description: prod.description ?? "",
      product_type: String(prod.product_type),
      price_amount: prod.price_amount !== null ? Number(prod.price_amount) : null,
      price_currency: String(prod.price_currency ?? "MXN"),
      conversion_mode: String(prod.conversion_mode ?? "informacion"),
      primary_action_label: (prod.primary_action_label as string | null) ?? null,
      secondary_action_mode: (prod.secondary_action_mode as string | null) ?? null,
      secondary_action_label: (prod.secondary_action_label as string | null) ?? null,
      accepts_online_payment: Boolean(prod.accepts_online_payment),
      requires_availability: Boolean(prod.requires_availability),
      visibility_level: String(prod.visibility_level ?? "standard"),
      cover_url: cover?.url ?? null,
      media,
      business: {
        id: biz.id as string,
        slug: biz.slug as string,
        display_name: biz.display_name as string,
        tagline: (biz.tagline as string) ?? "",
        verified: Boolean(biz.verified),
        destination_slug: typeof destSlug === "string" ? destSlug : "",
        category_slug: typeof catSlug === "string" ? catSlug : "",
        plan_tier: planTier,
        primary_contact: primaryContact,
        primary_location: primaryLocation,
      },
      related,
      promotions: (promos ?? []).map((p) => ({
        id: p.id as string,
        slug: p.slug as string,
        title: p.title as string,
        description: (p.description as string) ?? "",
        discount_percent: p.discount_percent !== null ? Number(p.discount_percent) : null,
        starts_at: p.starts_at as string | null,
        ends_at: p.ends_at as string | null,
        business_slug: biz.slug as string,
        business_name: biz.display_name as string,
      })),
      reviews: (reviews ?? []).map((r) => ({
        id: r.id as string,
        author_display_name: (r.author_display_name as string) ?? "Viajero",
        rating: Number(r.rating ?? 0),
        title: (r.title as string | null) ?? null,
        body: (r.body as string) ?? "",
        published_at: (r.published_at as string | null) ?? null,
      })),
      faqs: (faqs ?? []).map((f) => ({
        id: f.id as string,
        question: (f.question as string) ?? "",
        answer: (f.answer as string) ?? "",
        position: Number(f.position ?? 0),
      })),
    };
  });