/**
 * cms/zones-media.functions.ts — Server functions para galería de zonas
 * (hero + galería). Mismo patrón que destinations-media pero usando la
 * tabla `destination_zone_media` y el bucket `destinations` con prefijo
 * `zones/{zoneId}/...`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_editor_or_admin", {
    _user_id: ctx.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

const BUCKET = "destinations";

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ─────────────────────  Firma de subida  ──────────────────────────── */

interface SignUploadInput {
  zoneId: string;
  filename: string;
  contentType?: string;
}

export const signZoneImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SignUploadInput) => {
    if (!d?.zoneId || !d?.filename) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const clean = sanitizeFilename(data.filename) || "archivo";
    const path = `zones/${data.zoneId}/${Date.now()}-${Math.random()
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

/* ─────────────────  Registrar media + adjuntar a la zona  ─────────── */

interface RegisterMediaInput {
  zoneId: string;
  storagePath: string;
  role: "hero" | "gallery";
  alt?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export const registerZoneMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterMediaInput) => {
    if (!d?.zoneId || !d?.storagePath || !d?.role)
      throw new Error("invalid_input");
    if (d.role !== "hero" && d.role !== "gallery")
      throw new Error("invalid_role");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
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

    if (data.role === "hero") {
      await db
        .from("destination_zone_media")
        .delete()
        .eq("zone_id", data.zoneId)
        .eq("role", "hero");

      const { error: linkErr } = await db
        .from("destination_zone_media")
        .insert({
          zone_id: data.zoneId,
          media_asset_id: asset.id,
          role: "hero",
          sort_order: 0,
        });
      if (linkErr) throw linkErr;
    } else {
      const { data: last } = await db
        .from("destination_zone_media")
        .select("sort_order")
        .eq("zone_id", data.zoneId)
        .eq("role", "gallery")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((last?.sort_order as number | undefined) ?? -1) + 1;
      const { error: linkErr } = await db
        .from("destination_zone_media")
        .insert({
          zone_id: data.zoneId,
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
  zoneId: string;
}

export const listZoneMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListMediaInput) => {
    if (!d?.zoneId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("destination_zone_media")
      .select(
        "id, role, sort_order, media_asset_id, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
      )
      .eq("zone_id", data.zoneId)
      .order("role", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const out: {
      id: string;
      role: "hero" | "gallery";
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
  zoneId: string;
  orderedIds: string[];
}

export const reorderZoneGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReorderInput) => {
    if (!d?.zoneId || !Array.isArray(d.orderedIds))
      throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await db
        .from("destination_zone_media")
        .update({ sort_order: i })
        .eq("id", data.orderedIds[i])
        .eq("zone_id", data.zoneId)
        .eq("role", "gallery");
      if (error) throw error;
    }
    return { ok: true as const };
  });

/* ─────────────────────  Borrar imagen  ────────────────────────────── */

interface RemoveInput {
  zoneMediaId: string;
}

export const removeZoneMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RemoveInput) => {
    if (!d?.zoneMediaId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: link, error: readErr } = await db
      .from("destination_zone_media")
      .select(
        "id, role, zone_id, media_asset_id, media_assets:media_assets ( storage_path )",
      )
      .eq("id", data.zoneMediaId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!link) return { ok: true as const };

    const { error: delLinkErr } = await db
      .from("destination_zone_media")
      .delete()
      .eq("id", data.zoneMediaId);
    if (delLinkErr) throw delLinkErr;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asset = link.media_assets as any;
    if (asset?.storage_path) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = context.supabase.storage as any;
      await storage.from(BUCKET).remove([asset.storage_path]);
    }
    await db.from("media_assets").delete().eq("id", link.media_asset_id);

    return { ok: true as const };
  });