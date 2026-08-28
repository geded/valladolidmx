/**
 * Server functions para la Biblioteca de Medios del Experience Builder.
 *
 * Diseño:
 *  - Bucket privado `studio-media` (aprovisionado en migración).
 *  - Todo lo subido queda registrado en `media_assets` con
 *    kind='image' y storage_bucket='studio-media' → se ve en la
 *    Biblioteca CMS existente.
 *  - Los editores obtienen URLs estables `/api/public/studio-media/<path>`
 *    que el proxy convierte en URL firmada al servir. Estas URLs pueden
 *    guardarse dentro de la composición sin que expiren.
 *
 * Reglas: sólo editor/admin/super_admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveMediaAlt } from "@/lib/media/resolve-alt";
import {
  buildRightsMetadata,
  sha256Hex,
  validateMediaRights,
  type MediaRightsInput,
} from "./media-rights";

const BUCKET = "studio-media";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_editor_or_admin", {
    _user_id: ctx.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

function publicProxyUrl(path: string) {
  return `/api/public/studio-media/${path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/")}`;
}

function sanitizeFilename(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "imagen"
  );
}

/* ─────────────────────────────  Listar  ─────────────────────────────── */

interface ListInput {
  limit?: number;
  offset?: number;
  search?: string;
  /** G8-M1: aprobadas | pendientes | conceptuales | todas */
  filter?: "approved" | "pending" | "conceptual" | "all";
}


export const listStudioMediaLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const limit = Math.min(Math.max(data.limit ?? 60, 1), 200);
    const offset = Math.max(data.offset ?? 0, 0);
    const filter = data.filter ?? "all";
    let q = context.supabase
      .from("media_assets")
      .select(
        "id, storage_path, alt_text, alt_text_ai, alt_text_source, review_state, status, credit, metadata, original_checksum, title, width, height, mime_type, updated_at, media_asset_translations ( locale, alt_text, alt_text_ai, source, review_state )",
        { count: "exact" },
      )
      .eq("storage_bucket", BUCKET)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.search) q = q.ilike("alt_text", `%${data.search}%`);
    if (filter === "approved") q = q.eq("review_state", "approved");
    if (filter === "pending") q = q.neq("review_state", "approved");
    const { data: rows, count, error } = await q;
    if (error) throw error;
    const mapped = (rows ?? []).map(
      (r: {
        id: string;
        storage_path: string;
        alt_text: string | null;
        alt_text_ai: string | null;
        alt_text_source: string | null;
        review_state: string | null;
        status: string | null;
        credit: string | null;
        metadata: unknown;
        original_checksum: string | null;
        title: string | null;
        width: number | null;
        height: number | null;
        mime_type: string | null;
        media_asset_translations?: Array<{
          locale: string;
          alt_text: string | null;
          alt_text_ai: string | null;
          source: string | null;
          review_state: string | null;
        }> | null;
      }) => {
        const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as {
          rights?: Record<string, unknown>;
          focal?: { x?: number; y?: number };
        };
        const rights = meta.rights ?? {};
        const focal = meta.focal ?? {};
        const nature = (rights.nature as string | undefined) ?? null;
        return {
          id: r.id,
          url: publicProxyUrl(r.storage_path),
          alt: resolveMediaAlt(
            { ...r, translations: r.media_asset_translations ?? [] },
            { locale: "es", fallback: r.title ?? "" },
          ),
          credit: (rights.credit as string | null) ?? r.credit ?? null,
          author: (rights.author as string | null) ?? null,
          source: (rights.source as string | null) ?? null,
          license: (rights.license as string | null) ?? null,
          nature,
          aiGenerated: Boolean(rights.ai_generated),
          documentary: rights.documentary === true,
          conceptual: rights.documentary !== true,
          reviewState: r.review_state ?? "unreviewed",
          status: r.status ?? "draft",
          checksum: r.original_checksum,
          focalX: typeof focal.x === "number" ? focal.x : 0.5,
          focalY: typeof focal.y === "number" ? focal.y : 0.5,
          width: r.width,
          height: r.height,
          mime: r.mime_type,
        };
      },
    );
    return {
      rows: filter === "conceptual" ? mapped.filter((r) => r.conceptual) : mapped,
      total: count ?? 0,
      limit,
      offset,
    };
  });


/* ────────────────────────  Firmar upload  ───────────────────────────── */

interface SignInput {
  filename: string;
  contentType?: string;
}

export const signStudioMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SignInput) => {
    if (!d?.filename) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const clean = sanitizeFilename(data.filename);
    const path = `${new Date().getFullYear()}/${Date.now()}-${Math.random()
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

/* ────────────────  Registrar en media_assets  ───────────────────────── */

interface RegisterInput {
  storagePath: string;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  rights: MediaRightsInput;
}

/**
 * G8-M1 · Registro seguro.
 *  - Siempre crea un `media_asset` NUEVO (nunca sobrescribe).
 *  - Calcula el SHA-256 en el servidor a partir del objeto ya almacenado.
 *  - Nace `status=draft` + `review_state=unreviewed`: excluido de superficies
 *    públicas hasta aprobación gobernada.
 */
export const registerStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterInput) => {
    if (!d?.storagePath) throw new Error("invalid_input");
    const invalid = validateMediaRights(d.rights);
    if (invalid) throw new Error(invalid);
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const { data: blob, error: dlErr } = await storage.from(BUCKET).download(data.storagePath);
    if (dlErr) throw dlErr;
    const bytes: ArrayBuffer = await blob.arrayBuffer();
    const checksum = await sha256Hex(bytes);

    const metadata = buildRightsMetadata(data.rights);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: asset, error } = await db
      .from("media_assets")
      .insert({
        kind: "image",
        storage_bucket: BUCKET,
        storage_path: data.storagePath,
        alt_text: data.rights.alt.trim(),
        alt_text_source: "human",
        credit: data.rights.credit?.trim() || data.rights.author?.trim() || null,
        title: data.rights.place?.trim() || null,
        mime_type: data.mime ?? null,
        size_bytes: data.sizeBytes ?? bytes.byteLength,
        width: data.width ?? null,
        height: data.height ?? null,
        original_bucket: BUCKET,
        original_path: data.storagePath,
        original_bytes: bytes.byteLength,
        original_mime: data.mime ?? null,
        original_checksum: checksum,
        metadata,
        status: "draft",
        review_state: "unreviewed",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id, storage_path, alt_text, credit, review_state, status, original_checksum")
      .single();
    if (error) throw error;
    return {
      id: asset.id as string,
      url: publicProxyUrl(asset.storage_path as string),
      alt: asset.alt_text as string | null,
      credit: asset.credit as string | null,
      nature: data.rights.nature,
      reviewState: asset.review_state as string,
      status: asset.status as string,
      checksum: asset.original_checksum as string | null,
      focalX: metadata.focal.x,
      focalY: metadata.focal.y,
    };
  });

/* ───────────────  Aprobar para uso público (gobernado)  ─────────────── */

interface ApproveInput {
  mediaId: string;
}

export const approveStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ApproveInput) => {
    if (!d?.mediaId) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      db.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) throw new Error("forbidden_requires_admin");

    const { data: asset, error: readErr } = await db
      .from("media_assets")
      .select("id, alt_text, credit, metadata, original_checksum, created_by, storage_path")
      .eq("id", data.mediaId)
      .eq("storage_bucket", BUCKET)
      .is("deleted_at", null)
      .single();
    if (readErr) throw readErr;

    // Separación de funciones: quien sube no autoaprueba salvo super_admin.
    if (asset.created_by === context.userId && !isSuper) {
      throw new Error("self_approval_not_allowed");
    }

    const meta = (asset.metadata && typeof asset.metadata === "object" ? asset.metadata : {}) as {
      rights?: Record<string, unknown>;
    };
    const rights = meta.rights ?? {};
    if (!asset.alt_text || String(asset.alt_text).trim().length < 3) throw new Error("alt_required");
    if (!rights.rights_confirmed) throw new Error("rights_confirmation_required");
    if (!rights.nature) throw new Error("nature_required");
    if (rights.documentary === true && rights.ai_generated === true) {
      throw new Error("ai_cannot_be_documentary");
    }
    if (rights.documentary === true && !rights.source) throw new Error("documentary_requires_source");
    if (!asset.original_checksum) throw new Error("checksum_missing");

    const reviewedAt = new Date().toISOString();
    const { error: upErr } = await db
      .from("media_assets")
      .update({
        review_state: "approved",
        status: "published",
        reviewed_by: context.userId,
        reviewed_at: reviewedAt,
        updated_by: context.userId,
        metadata: {
          ...meta,
          governance: {
            approved_by: context.userId,
            approved_at: reviewedAt,
            authority: "G8-M1 · Safe Media Replacement MVP v1.0",
          },
        },
      })
      .eq("id", data.mediaId);
    if (upErr) throw upErr;

    return {
      id: data.mediaId,
      reviewState: "approved",
      status: "published",
      reviewedAt,
      url: publicProxyUrl(asset.storage_path as string),
    };
  });


/* ─────────────  Importar URL externa a la Biblioteca  ───────────────── */

interface ImportUrlInput {
  url: string;
  alt?: string | null;
}

export const importUrlToStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ImportUrlInput) => {
    if (!d?.url) throw new Error("invalid_input");
    if (!/^https?:\/\//i.test(d.url) && !/^data:image\//i.test(d.url)) {
      throw new Error("only_http_or_data_urls");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    let mime = "image/jpeg";
    let buf: Uint8Array;
    let baseName = "importada";
    if (/^data:image\//i.test(data.url)) {
      const match = data.url.match(/^data:([^;,]+)(;base64)?,(.*)$/);
      if (!match) throw new Error("invalid_data_uri");
      mime = match[1] || "image/jpeg";
      const isB64 = !!match[2];
      const payload = match[3];
      if (isB64) {
        const bin = atob(payload);
        buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      } else {
        buf = new TextEncoder().encode(decodeURIComponent(payload));
      }
    } else {
      const resp = await fetch(data.url, { redirect: "follow" });
      if (!resp.ok) throw new Error(`download_failed_${resp.status}`);
      mime = resp.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      if (!mime.startsWith("image/")) throw new Error("not_an_image");
      buf = new Uint8Array(await resp.arrayBuffer());
      try {
        const u = new URL(data.url);
        const last = u.pathname.split("/").filter(Boolean).pop();
        if (last) baseName = last;
      } catch { /* ignore */ }
    }
    if (buf.byteLength > 12 * 1024 * 1024) throw new Error("file_too_large");

    const ext = mime === "image/png" ? "png"
      : mime === "image/webp" ? "webp"
      : mime === "image/gif" ? "gif"
      : mime === "image/svg+xml" ? "svg"
      : "jpg";
    const clean = sanitizeFilename(baseName.replace(/\.[a-z0-9]+$/i, "")) + "." + ext;
    const path = `${new Date().getFullYear()}/imported-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${clean}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = context.supabase.storage as any;
    const { error: upErr } = await storage
      .from(BUCKET)
      .upload(path, buf, { contentType: mime, upsert: false });
    if (upErr) throw upErr;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: asset, error } = await db
      .from("media_assets")
      .insert({
        kind: "image",
        storage_bucket: BUCKET,
        storage_path: path,
        alt_text: data.alt ?? null,
        mime_type: mime,
        size_bytes: buf.byteLength,
        status: "published",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id, storage_path")
      .single();
    if (error) throw error;

    return {
      id: asset.id as string,
      url: publicProxyUrl(asset.storage_path as string),
    };
  });