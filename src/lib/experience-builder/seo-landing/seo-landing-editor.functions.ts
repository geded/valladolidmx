/**
 * LOTE 3I.2 · Autoría CMS-first de la familia `premium-seo-landing`.
 *
 * Lee y guarda el MODELO EDITORIAL de una landing (hero, señales de
 * confianza, beneficios, experiencias relacionadas, información práctica,
 * contexto territorial y cierre Alux) sobre la MISMA composición de 18 slots.
 *
 * Reglas vinculantes:
 *  - Sólo borradores: una landing publicada nunca se edita por esta vía.
 *  - Toda escritura pasa por la RPC gobernada `eb_save_composition_draft`
 *    (rol editorial + bitácora); no hay UPDATE directo.
 *  - La entidad canónica de origen NUNCA se modifica: el borrador guarda su
 *    propia copia editorial.
 *  - Cero contenido inventado: los campos vacíos se omiten del árbol.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toStablePublicMediaUrl } from "@/lib/media/stable-public-url";
import type { CompositionTree } from "../composition-tree";
import {
  buildSeoLandingComposition,
  readSeoLandingChrome,
  type SeoLandingSlotConfig,
  type SeoLandingSlotId,
} from "./seo-landing-template";

type Db = SupabaseClient<Database>;

/** Valor serializable admitido por el transporte de server functions. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type SeoLandingSlotJson = Record<string, JsonValue>;

export interface SeoLandingMediaOption {
  readonly id: string;
  readonly url: string;
  readonly alt: string;
  readonly role: string;
}

export interface SeoLandingEditorModel {
  readonly compositionId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly editable: boolean;
  readonly entityRef: string | null;
  readonly idPrefix: string;
  /** Config real por slot, tal como está persistida hoy. */
  readonly slots: Record<string, SeoLandingSlotJson>;
  /** Medios acreditados de la entidad de origen, seleccionables como hero. */
  readonly mediaOptions: readonly SeoLandingMediaOption[];
}

function slotIdOf(nodeId: string): string {
  const parts = nodeId.split("-");
  return parts[parts.length - 1] ?? "";
}

function prefixOf(nodeId: string): string {
  const parts = nodeId.split("-");
  return parts.slice(0, -1).join("-");
}

async function loadMediaOptions(supabase: Db, entityRef: string | null) {
  const items: SeoLandingMediaOption[] = [];
  const seen = new Set<string>();
  const push = (id: string, url: string | null, alt: string, role: string) => {
    if (!url || !alt || seen.has(url)) return;
    seen.add(url);
    items.push({ id, url, alt, role });
  };

  const [kind, id] = (entityRef ?? "").split(":");
  if (kind && id) {
    const select =
      "role, sort_order, media_asset_id, media_assets:media_asset_id ( storage_bucket, storage_path, alt_text )";
    const query =
      kind === "business"
        ? supabase.from("business_media").select(select).eq("business_id", id)
        : kind === "product"
          ? supabase.from("product_media").select(select).eq("product_id", id)
          : supabase.from("place_media").select(select).eq("place_id", id);
    const { data, error } = await query.order("sort_order", { ascending: true }).limit(24);
    if (!error) {
      for (const row of data ?? []) {
        const asset = row.media_assets as {
          storage_bucket?: string | null;
          storage_path?: string | null;
          alt_text?: string | null;
        } | null;
        push(
          String(row.media_asset_id),
          toStablePublicMediaUrl(asset?.storage_bucket, asset?.storage_path),
          (asset?.alt_text ?? "").trim(),
          String(row.role ?? "gallery"),
        );
      }
    }
  }

  // Biblioteca de Medios gobernada: permite resolver una portada aunque la
  // entidad de origen aún no tenga fotografía asociada, sin tocar su ficha.
  const { data: library } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, alt_text, is_demo_seed")
    .eq("storage_bucket", "studio-media")
    .not("alt_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  for (const asset of library ?? []) {
    push(
      String(asset.id),
      toStablePublicMediaUrl(asset.storage_bucket, asset.storage_path),
      (asset.alt_text ?? "").trim(),
      asset.is_demo_seed ? "biblioteca · demo" : "biblioteca",
    );
  }

  return items;
}


export const getSeoLandingEditorModel = createServerFn({ method: "GET" })
  .inputValidator((data: { compositionId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<SeoLandingEditorModel> => {
    const supabase = context.supabase as Db;
    const { data: row, error } = await supabase
      .from("page_compositions")
      .select("id, slug, title, status, published_at, current_draft")
      .eq("id", data.compositionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("seo_landing_not_found");

    const tree = (row.current_draft ?? null) as CompositionTree | null;
    const chrome = readSeoLandingChrome(tree);
    const slots: Record<string, SeoLandingSlotJson> = {};
    let idPrefix = "seo-landing";
    for (const node of tree?.root?.children ?? []) {
      slots[slotIdOf(node.id)] = (node.config ?? {}) as SeoLandingSlotJson;
      idPrefix = prefixOf(node.id) || idPrefix;
    }

    return {
      compositionId: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      editable: row.status !== "published" && !row.published_at,
      entityRef: chrome?.entityRef ?? null,
      idPrefix,
      slots,
      mediaOptions: await loadMediaOptions(supabase, chrome?.entityRef ?? null),
    };
  });

export const saveSeoLandingEditorModel = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { compositionId: string; slots: Record<string, SeoLandingSlotJson | null> }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ saved: true; populatedSlots: string[] }> => {
    const supabase = context.supabase as Db;
    const { data: row, error } = await supabase
      .from("page_compositions")
      .select("id, status, published_at, current_draft")
      .eq("id", data.compositionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("seo_landing_not_found");
    if (row.status === "published" || row.published_at)
      throw new Error("seo_landing_edit_requires_draft");

    const current = (row.current_draft ?? null) as CompositionTree | null;
    const chrome = readSeoLandingChrome(current);
    if (!chrome) throw new Error("seo_landing_chrome_missing");

    let idPrefix = "seo-landing";
    for (const node of current?.root?.children ?? []) idPrefix = prefixOf(node.id) || idPrefix;

    const tree = buildSeoLandingComposition({
      entityRef: chrome.entityRef,
      presentation: "editorial",
      idPrefix,
      slots: data.slots as Partial<Record<SeoLandingSlotId, SeoLandingSlotConfig | null>>,
    });

    const { error: saveError } = await supabase.rpc("eb_save_composition_draft", {
      _id: data.compositionId,
      _tree: tree as never,
    });
    if (saveError) throw new Error(saveError.message);

    const populated =
      (
        tree.chrome as unknown as {
          seo?: { landing?: { populatedSlots?: string[] } };
        }
      )?.seo?.landing?.populatedSlots ?? [];
    return { saved: true, populatedSlots: populated };
  });
