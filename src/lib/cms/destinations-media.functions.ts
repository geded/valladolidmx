/**
 * cms/destinations-media.functions.ts — Server functions para galería de
 * destinos (Ola 1 · Etapa 4). Todo pasa por `requireSupabaseAuth` +
 * `is_editor_or_admin`. Se apoya en el bucket `destinations` (privado) con
 * SELECT anon habilitado a nivel de `storage.objects`.
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

/* ─────────────────────  Selector de regiones  ─────────────────────── */

export const listTourismRegionsForSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditorial(context);
    const { data, error } = await context.supabase
      .from("tourism_regions")
      .select("id, name, slug")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as { id: string; name: string; slug: string }[];
  });

/* ─────────────────────  Selector de estados  ──────────────────────── */

export const listStatesForSelect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditorial(context);
    const { data, error } = await context.supabase
      .from("states")
      .select("id, name, iso_code")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as { id: string; name: string; iso_code: string }[];
  });

/* ─────────────────────  Firma de subida  ──────────────────────────── */

interface SignUploadInput {
  destinationId: string;
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

export const signDestinationImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SignUploadInput) => {
    if (!d?.destinationId || !d?.filename) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const clean = sanitizeFilename(data.filename) || "archivo";
    const path = `${data.destinationId}/${Date.now()}-${Math.random()
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

/* ─────────────────  Registrar media + adjuntar al destino  ────────── */

interface RegisterMediaInput {
  destinationId: string;
  storagePath: string;
  role: "hero" | "gallery";
  alt?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export const registerDestinationMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterMediaInput) => {
    if (!d?.destinationId || !d?.storagePath || !d?.role)
      throw new Error("invalid_input");
    if (d.role !== "hero" && d.role !== "gallery")
      throw new Error("invalid_role");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    // 1) media_assets
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
      // reemplaza el hero anterior (si había otro en destination_media)
      await db
        .from("destination_media")
        .delete()
        .eq("destination_id", data.destinationId)
        .eq("role", "hero");

      const { error: linkErr } = await db.from("destination_media").insert({
        destination_id: data.destinationId,
        media_asset_id: asset.id,
        role: "hero",
        sort_order: 0,
      });
      if (linkErr) throw linkErr;

      // apunta el destino al nuevo hero
      const { error: updErr } = await db
        .from("destinations")
        .update({ hero_media_id: asset.id, updated_by: context.userId })
        .eq("id", data.destinationId);
      if (updErr) throw updErr;
    } else {
      // gallery: sort_order = MAX + 1
      const { data: last } = await db
        .from("destination_media")
        .select("sort_order")
        .eq("destination_id", data.destinationId)
        .eq("role", "gallery")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((last?.sort_order as number | undefined) ?? -1) + 1;
      const { error: linkErr } = await db.from("destination_media").insert({
        destination_id: data.destinationId,
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
  destinationId: string;
}

export const listDestinationMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListMediaInput) => {
    if (!d?.destinationId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("destination_media")
      .select(
        "id, role, sort_order, media_asset_id, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
      )
      .eq("destination_id", data.destinationId)
      .order("role", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    // firma URLs para preview (1 hora)
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
  destinationId: string;
  orderedIds: string[];
}

export const reorderDestinationGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReorderInput) => {
    if (!d?.destinationId || !Array.isArray(d.orderedIds))
      throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await db
        .from("destination_media")
        .update({ sort_order: i })
        .eq("id", data.orderedIds[i])
        .eq("destination_id", data.destinationId)
        .eq("role", "gallery");
      if (error) throw error;
    }
    return { ok: true as const };
  });

/* ─────────────────────  Borrar imagen  ────────────────────────────── */

interface RemoveInput {
  destinationMediaId: string;
}

export const removeDestinationMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RemoveInput) => {
    if (!d?.destinationMediaId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    // Localizar el vínculo para saber si es hero y el destino
    const { data: link, error: readErr } = await db
      .from("destination_media")
      .select("id, role, destination_id, media_asset_id, media_assets:media_assets ( storage_path )")
      .eq("id", data.destinationMediaId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!link) return { ok: true as const };

    // Borra la fila (CASCADE del asset la borra si no queda referencia? no —
    // media_assets es padre. Borramos manualmente después).
    const { error: delLinkErr } = await db
      .from("destination_media")
      .delete()
      .eq("id", data.destinationMediaId);
    if (delLinkErr) throw delLinkErr;

    // Si era hero, limpiar destinations.hero_media_id
    if (link.role === "hero") {
      await db
        .from("destinations")
        .update({ hero_media_id: null, updated_by: context.userId })
        .eq("id", link.destination_id);
    }

    // Borrar el asset y el objeto de storage
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