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
}

export const listStudioMediaLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const limit = Math.min(Math.max(data.limit ?? 60, 1), 200);
    const offset = Math.max(data.offset ?? 0, 0);
    let q = context.supabase
      .from("media_assets")
      .select(
        "id, storage_path, alt_text, width, height, mime_type, updated_at",
        { count: "exact" },
      )
      .eq("storage_bucket", BUCKET)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.search) q = q.ilike("alt_text", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return {
      rows: (rows ?? []).map(
        (r: {
          id: string;
          storage_path: string;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          mime_type: string | null;
        }) => ({
          id: r.id,
          url: publicProxyUrl(r.storage_path),
          alt: r.alt_text,
          width: r.width,
          height: r.height,
          mime: r.mime_type,
        }),
      ),
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
  alt?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
}

export const registerStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: RegisterInput) => {
    if (!d?.storagePath) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: asset, error } = await db
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
      .select("id, storage_path")
      .single();
    if (error) throw error;
    return {
      id: asset.id as string,
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