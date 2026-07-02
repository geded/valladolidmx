/**
 * cms/businesses-media.functions.ts — Server functions para logo, portada
 * y galería de empresas (Ola 1 · Etapa 4). Todo pasa por
 * `requireSupabaseAuth`. La autorización acepta admins/editores O dueños
 * (≥editor en `business_users`). Bucket: `companies` (privado, RLS por
 * carpeta = businessId).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanEditBusiness(
  ctx: { supabase: any; userId: string },
  businessId: string,
) {
  const { data: editorial } = await ctx.supabase.rpc("is_editor_or_admin", {
    _user_id: ctx.userId,
  });
  if (editorial) return;
  const { data: owns } = await ctx.supabase.rpc("has_business_access", {
    _user_id: ctx.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (!owns) throw new Error("forbidden");
}

const BUCKET = "companies";

/* ─────────────────────  Selectores auxiliares  ────────────────────── */

export const listDestinationsForSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("destinations")
      .select("id, name, slug")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as { id: string; name: string; slug: string }[];
  });

export const listBusinessCategoriesForSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("business_categories")
      .select("id, name, slug")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as { id: string; name: string; slug: string }[];
  });

/* ─────────────────────  Firma de subida  ──────────────────────────── */

interface SignUploadInput {
  businessId: string;
  filename: string;
  contentType?: string;
}

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export const signBusinessImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SignUploadInput) => {
    if (!d?.businessId || !d?.filename) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditBusiness(context, data.businessId);
    const clean = sanitizeFilename(data.filename) || "archivo";
    const path = `${data.businessId}/${Date.now()}-${Math.random()
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

/* ─────────────────  Registrar media + adjuntar a la empresa  ─────── */

type BusinessMediaRole = "logo" | "cover" | "gallery";

interface RegisterMediaInput {
  businessId: string;
  storagePath: string;
  role: BusinessMediaRole;
  alt?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export const registerBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterMediaInput) => {
    if (!d?.businessId || !d?.storagePath || !d?.role)
      throw new Error("invalid_input");
    if (!["logo", "cover", "gallery"].includes(d.role))
      throw new Error("invalid_role");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditBusiness(context, data.businessId);
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

    if (data.role === "logo" || data.role === "cover") {
      // reemplaza el existente del mismo rol
      await db
        .from("business_media")
        .delete()
        .eq("business_id", data.businessId)
        .eq("role", data.role);
      const { error: linkErr } = await db.from("business_media").insert({
        business_id: data.businessId,
        media_asset_id: asset.id,
        role: data.role,
        sort_order: 0,
      });
      if (linkErr) throw linkErr;
      const col = data.role === "logo" ? "logo_media_id" : "cover_media_id";
      const { error: updErr } = await db
        .from("businesses")
        .update({ [col]: asset.id, updated_by: context.userId })
        .eq("id", data.businessId);
      if (updErr) throw updErr;
    } else {
      const { data: last } = await db
        .from("business_media")
        .select("sort_order")
        .eq("business_id", data.businessId)
        .eq("role", "gallery")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((last?.sort_order as number | undefined) ?? -1) + 1;
      const { error: linkErr } = await db.from("business_media").insert({
        business_id: data.businessId,
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
  businessId: string;
}

export const listBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListMediaInput) => {
    if (!d?.businessId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditBusiness(context, data.businessId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("business_media")
      .select(
        "id, role, sort_order, media_asset_id, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
      )
      .eq("business_id", data.businessId)
      .order("role", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const out: {
      id: string;
      role: BusinessMediaRole;
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
  businessId: string;
  orderedIds: string[];
}

export const reorderBusinessGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReorderInput) => {
    if (!d?.businessId || !Array.isArray(d.orderedIds))
      throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertCanEditBusiness(context, data.businessId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await db
        .from("business_media")
        .update({ sort_order: i })
        .eq("id", data.orderedIds[i])
        .eq("business_id", data.businessId)
        .eq("role", "gallery");
      if (error) throw error;
    }
    return { ok: true as const };
  });

/* ─────────────────────  Borrar imagen  ────────────────────────────── */

interface RemoveInput {
  businessMediaId: string;
}

export const removeBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RemoveInput) => {
    if (!d?.businessMediaId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: link, error: readErr } = await db
      .from("business_media")
      .select(
        "id, role, business_id, media_asset_id, media_assets:media_assets ( storage_path )",
      )
      .eq("id", data.businessMediaId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!link) return { ok: true as const };

    await assertCanEditBusiness(context, link.business_id as string);

    const { error: delLinkErr } = await db
      .from("business_media")
      .delete()
      .eq("id", data.businessMediaId);
    if (delLinkErr) throw delLinkErr;

    if (link.role === "logo" || link.role === "cover") {
      const col = link.role === "logo" ? "logo_media_id" : "cover_media_id";
      await db
        .from("businesses")
        .update({ [col]: null, updated_by: context.userId })
        .eq("id", link.business_id);
    }

    // Borra el media_asset y el archivo del bucket (best effort).
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