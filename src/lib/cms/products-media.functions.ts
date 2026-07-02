/**
 * cms/products-media.functions.ts — Server functions para portada y
 * galería de productos (Ola 1 · Etapa 4). Bucket: `products` (privado).
 * Autorización: admins/editores O dueños (≥editor) de la empresa asociada.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveBusinessIdForProduct(db: any, productId: string) {
  const { data, error } = await db
    .from("products")
    .select("business_id")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  const bid = (data?.business_id as string | undefined) ?? null;
  if (!bid) throw new Error("product_not_found");
  return bid;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanEditProductMedia(
  ctx: { supabase: any; userId: string },
  productId: string,
) {
  const { data: editorial } = await ctx.supabase.rpc("is_editor_or_admin", {
    _user_id: ctx.userId,
  });
  if (editorial) return;
  const businessId = await resolveBusinessIdForProduct(ctx.supabase, productId);
  const { data: owns } = await ctx.supabase.rpc("has_business_access", {
    _user_id: ctx.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (!owns) throw new Error("forbidden");
}

const BUCKET = "products";

/* ─────────────────  Selector de empresas  ────────────────── */

export const listBusinessesForProductSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("businesses")
      .select("id, display_name, slug")
      .is("deleted_at", null)
      .order("display_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as {
      id: string;
      display_name: string;
      slug: string;
    }[];
  });

/* ─────────────────────  Firma de subida  ──────────────────────────── */

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

interface SignUploadInput {
  productId: string;
  filename: string;
  contentType?: string;
}

export const signProductImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SignUploadInput) => {
    if (!d?.productId || !d?.filename) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditProductMedia(context, data.productId);
    // La RLS del bucket `products` exige que la primera carpeta sea el
    // business_id (no el product_id). Resolvemos el business_id aquí.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const businessId = await resolveBusinessIdForProduct(db, data.productId);
    const clean = sanitizeFilename(data.filename) || "archivo";
    const path = `${businessId}/${data.productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${clean}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const { data: signed, error } = await storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return {
      path: signed.path as string,
      token: signed.token as string,
      bucket: BUCKET,
    };
  });

/* ─────────────────  Registrar media + adjuntar al producto  ─────── */

type ProductMediaRole = "cover" | "gallery";

interface RegisterMediaInput {
  productId: string;
  storagePath: string;
  role: ProductMediaRole;
  alt?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export const registerProductMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterMediaInput) => {
    if (!d?.productId || !d?.storagePath || !d?.role)
      throw new Error("invalid_input");
    if (!["cover", "gallery"].includes(d.role))
      throw new Error("invalid_role");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditProductMedia(context, data.productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: asset, error: assetErr } = await db
      .from("media_assets")
      .insert({
        kind: "image",
        storage_bucket: BUCKET,
        storage_path: data.storagePath,
        alt_text: data.alt ?? null,
        mime_type: data.mime ?? null,
        size_bytes: data.sizeBytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        status: "published",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();
    if (assetErr) throw assetErr;

    if (data.role === "cover") {
      await db
        .from("product_media")
        .delete()
        .eq("product_id", data.productId)
        .eq("role", "cover");
      const { error: linkErr } = await db.from("product_media").insert({
        product_id: data.productId,
        media_asset_id: asset.id,
        role: "cover",
        sort_order: 0,
      });
      if (linkErr) throw linkErr;
      const { error: updErr } = await db
        .from("products")
        .update({ cover_media_id: asset.id, updated_by: context.userId })
        .eq("id", data.productId);
      if (updErr) throw updErr;
    } else {
      const { data: last } = await db
        .from("product_media")
        .select("sort_order")
        .eq("product_id", data.productId)
        .eq("role", "gallery")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((last?.sort_order as number | undefined) ?? -1) + 1;
      const { error: linkErr } = await db.from("product_media").insert({
        product_id: data.productId,
        media_asset_id: asset.id,
        role: "gallery",
        sort_order: nextOrder,
      });
      if (linkErr) throw linkErr;
    }

    return { mediaAssetId: asset.id as string };
  });

/* ─────────────────────  Lectura de galería  ───────────────────────── */

interface ListMediaInput {
  productId: string;
}

export const listProductMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListMediaInput) => {
    if (!d?.productId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditProductMedia(context, data.productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("product_media")
      .select(
        "id, role, sort_order, media_asset_id, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
      )
      .eq("product_id", data.productId)
      .order("role", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const out: {
      id: string;
      role: ProductMediaRole;
      sortOrder: number;
      mediaAssetId: string;
      storagePath: string;
      alt: string | null;
      previewUrl: string | null;
    }[] = [];
    for (const r of rows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const asset = r.media_assets as any;
      let previewUrl: string | null = null;
      if (asset?.storage_path) {
        const { data: signed } = await storage
          .from(BUCKET)
          .createSignedUrl(asset.storage_path, 3600);
        previewUrl = signed?.signedUrl ?? null;
      }
      out.push({
        id: r.id,
        role: r.role,
        sortOrder: r.sort_order,
        mediaAssetId: r.media_asset_id,
        storagePath: asset?.storage_path ?? "",
        alt: asset?.alt_text ?? null,
        previewUrl,
      });
    }
    return out;
  });

/* ─────────────────────  Reordenar galería  ────────────────────────── */

interface ReorderInput {
  productId: string;
  orderedIds: string[];
}

export const reorderProductGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReorderInput) => {
    if (!d?.productId || !Array.isArray(d.orderedIds))
      throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditProductMedia(context, data.productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await db
        .from("product_media")
        .update({ sort_order: i })
        .eq("id", data.orderedIds[i])
        .eq("product_id", data.productId)
        .eq("role", "gallery");
      if (error) throw error;
    }
    return { ok: true as const };
  });

/* ─────────────────────  Borrar imagen  ────────────────────────────── */

interface RemoveInput {
  productMediaId: string;
}

export const removeProductMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RemoveInput) => {
    if (!d?.productMediaId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: link, error: readErr } = await db
      .from("product_media")
      .select(
        "id, role, product_id, media_asset_id, media_assets:media_assets ( storage_path )",
      )
      .eq("id", data.productMediaId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!link) return { ok: true as const };

    await assertCanEditProductMedia(context, link.product_id as string);

    const { error: delLinkErr } = await db
      .from("product_media")
      .delete()
      .eq("id", data.productMediaId);
    if (delLinkErr) throw delLinkErr;

    if (link.role === "cover") {
      await db
        .from("products")
        .update({ cover_media_id: null, updated_by: context.userId })
        .eq("id", link.product_id);
    }

    try {
      await db.from("media_assets").delete().eq("id", link.media_asset_id);
    } catch {
      /* ignore */
    }
    try {
      const storagePath = (link.media_assets as { storage_path?: string } | null)
        ?.storage_path;
      if (storagePath) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = context.supabase.storage as any;
        await storage.from(BUCKET).remove([storagePath]);
      }
    } catch {
      /* ignore */
    }

    return { ok: true as const };
  });