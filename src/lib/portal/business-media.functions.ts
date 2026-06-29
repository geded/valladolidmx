/**
 * portal/business-media.functions.ts — Galería de empresa
 * (Ola 3 · Etapa 5 · Plan 14.30).
 *
 * Garantías:
 *  - Toda escritura usa requireSupabaseAuth (RLS aplica como user).
 *  - has_business_access('editor') validado en cada handler antes
 *    de tocar storage o RPCs.
 *  - Subidas: server fn devuelve una signed upload URL acotada por
 *    bucket + path `<business_id>/...`. El cliente sube directo a
 *    Storage usando esa URL (no se expone SUPABASE_SERVICE_ROLE_KEY).
 *  - Registro en media_assets + business_media via RPC SECURITY
 *    DEFINER `register_business_media` (whitelist de campos +
 *    auditoría en content_audit_log).
 *  - Edición de metadatos via `update_business_media_meta`.
 *  - Eliminación via `remove_business_media` (soft-delete del asset).
 *  - Sin SUPABASE_SERVICE_ROLE_KEY. Sin DDL.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- Tipos ---------------------------------------------------

export type PortalMediaRole = "logo" | "cover" | "gallery";

export interface PortalMediaItem {
  business_media_id: string;
  media_asset_id: string;
  role: PortalMediaRole;
  sort_order: number;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: string | null;
  caption: string | null;
  signed_url: string | null;
}

export interface SignedUploadTicket {
  bucket: string;
  path: string;
  token: string;
  signed_url: string;
  expires_in_seconds: number;
}

// ---------------- Constantes ---------------------------------------------

const ALLOWED_ROLES: PortalMediaRole[] = ["logo", "cover", "gallery"];
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_TTL = 60 * 60; // 1 h

function roleToBucket(role: PortalMediaRole): string {
  switch (role) {
    case "logo":
      return "logos";
    case "cover":
      return "companies";
    case "gallery":
      return "gallery";
  }
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  return mime.split("/")[1] ?? "bin";
}

function assertBusinessId(input: unknown): string {
  if (!input || typeof input !== "object") throw new Error("invalid_input");
  const id = (input as { businessId?: unknown }).businessId;
  if (typeof id !== "string" || id.length < 8)
    throw new Error("invalid_business");
  return id;
}

function assertRole(value: unknown): PortalMediaRole {
  if (typeof value !== "string" || !ALLOWED_ROLES.includes(value as PortalMediaRole))
    throw new Error("invalid_media_role");
  return value as PortalMediaRole;
}

function trimOrNull(value: unknown, max: number, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const t = value.trim();
  if (!t.length) return null;
  if (t.length > max) throw new Error(`invalid_${field}_length`);
  return t;
}

async function ensureAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: { supabase: any; userId: string },
  businessId: string,
  minRole: "viewer" | "editor",
) {
  const { data: allowed, error } = await context.supabase.rpc(
    "has_business_access",
    {
      _user_id: context.userId,
      _business_id: businessId,
      _min_role: minRole,
    },
  );
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (!allowed) throw new Error("forbidden_business_access");
}

// ---------------- Listado -------------------------------------------------

export const listBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalMediaItem[]> => {
    await ensureAccess(context, data.businessId, "viewer");

    const { data: rows, error } = await context.supabase
      .from("business_media")
      .select(
        "id, media_asset_id, role, sort_order, media_assets!inner(storage_bucket, storage_path, mime_type, width, height, size_bytes, alt_text, caption, deleted_at)",
      )
      .eq("business_id", data.businessId)
      .order("role", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`list_media_failed: ${error.message}`);

    const items: PortalMediaItem[] = [];
    for (const row of (rows ?? []) as Array<{
      id: string;
      media_asset_id: string;
      role: string;
      sort_order: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      media_assets: any;
    }>) {
      const ma = row.media_assets;
      if (!ma || ma.deleted_at) continue;
      const { data: signed } = await context.supabase.storage
        .from(ma.storage_bucket)
        .createSignedUrl(ma.storage_path, SIGNED_URL_TTL);
      items.push({
        business_media_id: row.id,
        media_asset_id: row.media_asset_id,
        role: row.role as PortalMediaRole,
        sort_order: row.sort_order,
        storage_bucket: ma.storage_bucket,
        storage_path: ma.storage_path,
        mime_type: ma.mime_type ?? null,
        width: ma.width ?? null,
        height: ma.height ?? null,
        size_bytes: ma.size_bytes ?? null,
        alt_text: ma.alt_text ?? null,
        caption: ma.caption ?? null,
        signed_url: signed?.signedUrl ?? null,
      });
    }
    return items;
  });

// ---------------- Signed upload ticket ------------------------------------

export const createBusinessMediaUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      role: PortalMediaRole;
      mime: string;
      sizeBytes: number;
      filename?: string;
    }) => ({
      businessId: assertBusinessId(input),
      role: assertRole(input?.role),
      mime: (() => {
        if (typeof input?.mime !== "string" || !ALLOWED_MIME.has(input.mime))
          throw new Error("invalid_mime");
        return input.mime;
      })(),
      sizeBytes: (() => {
        const n = Number(input?.sizeBytes);
        if (!Number.isFinite(n) || n <= 0 || n > MAX_BYTES)
          throw new Error("invalid_size");
        return Math.floor(n);
      })(),
      filename: trimOrNull(input?.filename ?? null, 120, "filename"),
    }),
  )
  .handler(async ({ data, context }): Promise<SignedUploadTicket> => {
    await ensureAccess(context, data.businessId, "editor");

    const bucket = roleToBucket(data.role);
    const ext = extFromMime(data.mime);
    const uniq = crypto.randomUUID();
    const folder =
      data.role === "cover" ? `${data.businessId}/cover` : data.businessId;
    const path = `${folder}/${uniq}.${ext}`;

    const { data: signed, error } = await context.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !signed)
      throw new Error(`signed_upload_failed: ${error?.message ?? "unknown"}`);

    return {
      bucket,
      path: signed.path ?? path,
      token: signed.token,
      signed_url: signed.signedUrl,
      expires_in_seconds: 120,
    };
  });

// ---------------- Registro tras upload ------------------------------------

export const registerBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      role: PortalMediaRole;
      bucket: string;
      path: string;
      mime: string;
      sizeBytes: number;
      width?: number | null;
      height?: number | null;
      altText?: string | null;
      caption?: string | null;
      sortOrder?: number;
    }) => ({
      businessId: assertBusinessId(input),
      role: assertRole(input?.role),
      bucket: (() => {
        if (typeof input?.bucket !== "string") throw new Error("invalid_bucket");
        return input.bucket;
      })(),
      path: (() => {
        if (typeof input?.path !== "string" || input.path.length === 0)
          throw new Error("invalid_path");
        if (input.path.length > 500) throw new Error("invalid_path_length");
        return input.path;
      })(),
      mime: (() => {
        if (typeof input?.mime !== "string" || !ALLOWED_MIME.has(input.mime))
          throw new Error("invalid_mime");
        return input.mime;
      })(),
      sizeBytes: (() => {
        const n = Number(input?.sizeBytes);
        if (!Number.isFinite(n) || n <= 0 || n > MAX_BYTES)
          throw new Error("invalid_size");
        return Math.floor(n);
      })(),
      width:
        input?.width === null || input?.width === undefined
          ? null
          : Math.max(1, Math.min(20000, Math.floor(Number(input.width)))),
      height:
        input?.height === null || input?.height === undefined
          ? null
          : Math.max(1, Math.min(20000, Math.floor(Number(input.height)))),
      altText: trimOrNull(input?.altText ?? null, 300, "alt_text"),
      caption: trimOrNull(input?.caption ?? null, 500, "caption"),
      sortOrder:
        input?.sortOrder === undefined
          ? 0
          : Math.max(0, Math.min(9999, Math.floor(Number(input.sortOrder)))),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ business_media_id: string; media_asset_id: string }> => {
      await ensureAccess(context, data.businessId, "editor");

      const { data: out, error } = await context.supabase.rpc(
        "register_business_media",
        {
          _business_id: data.businessId,
          _role: data.role,
          _bucket: data.bucket,
          _path: data.path,
          _mime: data.mime,
          _size_bytes: data.sizeBytes,
          _width: data.width ?? undefined,
          _height: data.height ?? undefined,
          _alt_text: data.altText ?? undefined,
          _caption: data.caption ?? undefined,
          _sort_order: data.sortOrder,
        },
      );
      if (error) throw new Error(`register_media_failed: ${error.message}`);
      const r = out as { business_media_id: string; media_asset_id: string };
      return r;
    },
  );

// ---------------- Update metadata ----------------------------------------

export const updateBusinessMediaMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessMediaId: string;
      altText?: string | null;
      caption?: string | null;
      sortOrder?: number | null;
    }) => ({
      businessMediaId: (() => {
        if (typeof input?.businessMediaId !== "string" || input.businessMediaId.length < 8)
          throw new Error("invalid_business_media_id");
        return input.businessMediaId;
      })(),
      altText: trimOrNull(input?.altText ?? null, 300, "alt_text"),
      caption: trimOrNull(input?.caption ?? null, 500, "caption"),
      sortOrder:
        input?.sortOrder === null || input?.sortOrder === undefined
          ? null
          : Math.max(0, Math.min(9999, Math.floor(Number(input.sortOrder)))),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "update_business_media_meta",
      {
        _business_media_id: data.businessMediaId,
        _alt_text: data.altText ?? undefined,
        _caption: data.caption ?? undefined,
        _sort_order: data.sortOrder ?? undefined,
      },
    );
    if (error) throw new Error(`update_media_failed: ${error.message}`);
    return { ok: true as const };
  });

// ---------------- Eliminar ------------------------------------------------

export const removeBusinessMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessMediaId: string }) => ({
    businessMediaId: (() => {
      if (typeof input?.businessMediaId !== "string" || input.businessMediaId.length < 8)
        throw new Error("invalid_business_media_id");
      return input.businessMediaId;
    })(),
  }))
  .handler(async ({ data, context }) => {
    // La RPC valida acceso editor sobre el business_id derivado del registro.
    const { error } = await context.supabase.rpc("remove_business_media", {
      _business_media_id: data.businessMediaId,
    });
    if (error) throw new Error(`remove_media_failed: ${error.message}`);
    return { ok: true as const };
  });