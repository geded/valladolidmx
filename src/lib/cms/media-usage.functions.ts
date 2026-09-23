/**
 * Biblioteca multimedia · Uso real de cada fotografía.
 *
 * La columna `media_assets.usage_context` es una etiqueta manual que casi nunca
 * se rellena. Este módulo NO la sustituye: deriva de las referencias reales
 * (portadas y galerías del CMS) dónde está usada cada imagen, para que la
 * biblioteca deje de decir "Sin asignar" cuando la foto sí es portada de un
 * evento, empresa, producto, destino o ruta.
 *
 * Sólo lectura, fail-soft: si una consulta falla, la imagen conserva su fila
 * sin referencias inventadas.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

export interface MediaUsageReference {
  mediaId: string;
  /** Rol editorial legible: "Portada", "Logotipo", "Galería". */
  role: string;
  /** Familia legible: "evento", "empresa", "producto"… */
  family: string;
  /** Nombre de la ficha que usa la imagen. */
  entityLabel: string;
  /** Ruta del CMS donde se edita esa ficha, cuando existe. */
  href: string | null;
}

interface DirectSpec {
  table: string;
  column: string;
  labelColumn: string;
  family: string;
  role: string;
  href: ((id: string) => string) | null;
}

const DIRECT: DirectSpec[] = [
  {
    table: "events",
    column: "cover_media_id",
    labelColumn: "title",

    family: "evento",
    role: "Portada",
    href: (id) => `/cms/eventos/${id}/editar`,
  },
  {
    table: "businesses",
    column: "cover_media_id",
    labelColumn: "display_name",
    family: "empresa",
    role: "Portada",
    href: (id) => `/cms/empresas/${id}/editar`,
  },
  {
    table: "businesses",
    column: "logo_media_id",
    labelColumn: "display_name",
    family: "empresa",
    role: "Logotipo",
    href: (id) => `/cms/empresas/${id}/editar`,
  },
  {
    table: "products",
    column: "cover_media_id",
    labelColumn: "name",
    family: "producto",
    role: "Portada",
    href: (id) => `/cms/productos/${id}/editar`,
  },
  {
    table: "destinations",
    column: "hero_media_id",
    labelColumn: "name",
    family: "destino",
    role: "Imagen principal",
    href: (id) => `/cms/destinos/${id}/editar`,
  },
  {
    table: "editorial_routes",
    column: "cover_media_id",
    labelColumn: "name",
    family: "ruta",
    role: "Portada",
    href: (id) => `/cms/rutas/${id}/editar`,
  },
  {
    table: "promotions",
    column: "cover_media_id",
    labelColumn: "title",
    family: "promoción",
    role: "Portada",
    href: null,
  },
  {
    table: "articles",
    column: "cover_media_id",
    labelColumn: "title",
    family: "artículo",
    role: "Portada",
    href: null,
  },
  {
    table: "banners",
    column: "cover_media_id",
    labelColumn: "title",
    family: "banner",
    role: "Portada",
    href: null,
  },
];

interface JoinSpec {
  table: string;
  fkColumn: string;
  parentTable: string;
  parentLabel: string;
  family: string;
  href: ((id: string) => string) | null;
}

const JOINS: JoinSpec[] = [
  {
    table: "business_media",
    fkColumn: "business_id",
    parentTable: "businesses",
    parentLabel: "display_name",
    family: "empresa",
    href: (id) => `/cms/empresas/${id}/editar`,
  },
  {
    table: "product_media",
    fkColumn: "product_id",
    parentTable: "products",
    parentLabel: "name",
    family: "producto",
    href: (id) => `/cms/productos/${id}/editar`,
  },
  {
    table: "place_media",
    fkColumn: "place_id",
    parentTable: "points_of_interest",
    parentLabel: "name",
    family: "lugar",
    href: (id) => `/cms/lugares/${id}/editar`,
  },
  {
    table: "destination_media",
    fkColumn: "destination_id",
    parentTable: "destinations",
    parentLabel: "name",
    family: "destino",
    href: (id) => `/cms/destinos/${id}/editar`,
  },
];

function roleLabel(raw: unknown): string {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "cover" || value === "portada") return "Portada";
  if (value === "logo") return "Logotipo";
  return "Galería";
}

const Input = z.object({ mediaIds: z.array(z.string().uuid()).max(200) });

/**
 * Resolutor compartido: la lista y la ficha muestran exactamente el mismo uso.
 * `db` es un cliente Supabase ya autenticado por quien llama.
 */
export async function resolveMediaUsageReferences(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  mediaIds: string[],
): Promise<MediaUsageReference[]> {
  const ids = Array.from(new Set(mediaIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const references: MediaUsageReference[] = [];

  for (const spec of DIRECT) {
    try {
      const { data: rows, error } = await db
        .from(spec.table)
        .select(`id, ${spec.labelColumn}, ${spec.column}`)
        .in(spec.column, ids);
      if (error || !rows) continue;
      for (const row of rows as Array<Record<string, unknown>>) {
        const mediaId = String(row[spec.column] ?? "");
        const entityId = String(row.id ?? "");
        if (!mediaId || !entityId) continue;
        references.push({
          mediaId,
          role: spec.role,
          family: spec.family,
          entityLabel: String(row[spec.labelColumn] ?? "(sin nombre)"),
          href: spec.href ? spec.href(entityId) : null,
        });
      }
    } catch {
      /* fail-soft: una fuente ilegible no inventa ni bloquea el resto. */
    }
  }

  for (const spec of JOINS) {
    try {
      const { data: links, error } = await db
        .from(spec.table)
        .select(`media_asset_id, role, ${spec.fkColumn}`)
        .in("media_asset_id", ids);
      if (error || !links || links.length === 0) continue;
      const linkRows = links as Array<Record<string, unknown>>;
      const parentIds = Array.from(
        new Set(linkRows.map((l) => String(l[spec.fkColumn] ?? "")).filter(Boolean)),
      );
      const labels = new Map<string, string>();
      if (parentIds.length > 0) {
        const { data: parents } = await db
          .from(spec.parentTable)
          .select(`id, ${spec.parentLabel}`)
          .in("id", parentIds);
        for (const p of (parents ?? []) as Array<Record<string, unknown>>) {
          labels.set(String(p.id), String(p[spec.parentLabel] ?? "(sin nombre)"));
        }
      }
      for (const link of linkRows) {
        const mediaId = String(link.media_asset_id ?? "");
        const parentId = String(link[spec.fkColumn] ?? "");
        if (!mediaId || !parentId) continue;
        references.push({
          mediaId,
          role: roleLabel(link.role),
          family: spec.family,
          entityLabel: labels.get(parentId) ?? "(sin nombre)",
          href: spec.href ? spec.href(parentId) : null,
        });
      }
    } catch {
      /* fail-soft */
    }
  }

  // Deduplicamos: una misma foto puede estar como portada y en galería.
  const seen = new Set<string>();
  return references.filter((r) => {
    const key = `${r.mediaId}|${r.role}|${r.family}|${r.entityLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const listMediaUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ references: MediaUsageReference[] }> => {
    await assertEditorial(context);
    return { references: await resolveMediaUsageReferences(context.supabase, data.mediaIds) };
  });


/* ─────────────────────────  Ficha de la imagen  ─────────────────────── */

const DetailInput = z.object({ mediaId: z.string().uuid() });

export interface MediaDetail {
  id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  kind: string | null;
  width: number | null;
  height: number | null;
  status: string | null;
  review_state: string | null;
  alt_text: string | null;
  alt_text_ai: string | null;
  alt_text_source: string | null;
  title: string | null;
  description: string | null;
  caption: string | null;
  credit: string | null;
  usage_context: string | null;
  original_checksum: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function num(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export const getMediaDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DetailInput.parse(d))
  .handler(async ({ data, context }): Promise<{ media: MediaDetail; previewUrl: string | null }> => {
    await assertEditorial(context);
    const { data: media, error } = await context.supabase
      .from("media_assets")
      .select(
        "id, storage_bucket, storage_path, mime_type, kind, width, height, status, review_state, alt_text, alt_text_ai, alt_text_source, title, description, caption, credit, usage_context, original_checksum, metadata, created_at, updated_at",
      )
      .eq("id", data.mediaId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!media) throw new Error("not_found");

    const row = media as Record<string, unknown>;
    const detail: MediaDetail = {
      id: String(row.id),
      storage_bucket: text(row.storage_bucket),
      storage_path: text(row.storage_path),
      mime_type: text(row.mime_type),
      kind: text(row.kind),
      width: num(row.width),
      height: num(row.height),
      status: text(row.status),
      review_state: text(row.review_state),
      alt_text: text(row.alt_text),
      alt_text_ai: text(row.alt_text_ai),
      alt_text_source: text(row.alt_text_source),
      title: text(row.title),
      description: text(row.description),
      caption: text(row.caption),
      credit: text(row.credit),
      usage_context: text(row.usage_context),
      original_checksum: text(row.original_checksum),
      metadata:
        typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    };

    let previewUrl: string | null = null;
    if (detail.storage_bucket && detail.storage_path) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = (context.supabase as any).storage;
        const { data: signed } = await storage
          .from(detail.storage_bucket)
          .createSignedUrl(detail.storage_path, 3600);
        previewUrl = signed?.signedUrl ?? null;
      } catch {
        previewUrl = null;
      }
    }

    return { media: detail, previewUrl };
  });

