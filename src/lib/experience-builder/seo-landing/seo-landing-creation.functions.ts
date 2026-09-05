/**
 * G8-R1-C+L · Paso CL3 — Server functions de creación contextual de
 * Landings SEO (`premium-seo-landing`).
 *
 * Reglas vinculantes:
 *  - Sólo `super_admin` / `admin` / `editor` (autorización efectiva por RLS
 *    y `has_role`).
 *  - Idempotencia por `chrome.seo.landing.entityRef`: nunca se crea una
 *    segunda landing para la misma entidad.
 *  - Cero contenido inventado: los slots se llenan exclusivamente con datos
 *    reales del CMS; los vacíos se omiten.
 *  - Cero publicación, cero redirects, cero sitemap, cero migración.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toStablePublicMediaUrl } from "@/lib/media/stable-public-url";
import type { CompositionTree } from "../composition-tree";
import {
  buildSeoLandingComposition,
  type SeoLandingSlotConfig,
  type SeoLandingSlotId,
} from "./seo-landing-template";
import {
  LEGACY_SEO_LANDING_DRAFTS,
  buildSeoLandingEntityRef,
  buildSeoLandingSeoPolicy,
  buildSeoLandingSlug,
  resolveSeoLandingState,
  type ExistingSeoLandingRow,
  type SeoLandingEntityType,
  type SeoLandingResolution,
} from "./seo-landing-creation";

type Db = SupabaseClient<Database>;

interface CompositionRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  current_draft?: unknown;
}

interface SeoChromeShape {
  seo?: { landing?: { entityRef?: string; populatedSlots?: string[] } };
}

interface EntitySnapshot {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  coverMediaId: string | null;
  destinationSlug: string | null;
  destinationName: string | null;
  categorySlug: string | null;
}

/* ------------------------------------------------------------------ *
 * Lecturas reales (fail-closed).
 * ------------------------------------------------------------------ */

async function loadEntity(
  supabase: Db,
  entityType: SeoLandingEntityType,
  entityId: string,
): Promise<EntitySnapshot> {
  if (entityType === "business") {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, description, cover_media_id, destination_id, primary_category_id",
      )
      .eq("id", entityId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("seo_landing_entity_not_found");
    const [dest, cat] = await Promise.all([
      data.destination_id
        ? supabase
            .from("destinations")
            .select("slug, name")
            .eq("id", data.destination_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      data.primary_category_id
        ? supabase
            .from("business_categories")
            .select("slug")
            .eq("id", data.primary_category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      id: data.id,
      slug: data.slug,
      title: data.display_name,
      tagline: data.tagline,
      description: data.description,
      coverMediaId: data.cover_media_id,
      destinationSlug: dest?.data?.slug ?? null,
      destinationName: dest?.data?.name ?? null,
      categorySlug: cat?.data?.slug ?? null,
    };
  }

  if (entityType === "product") {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, tagline, description, cover_media_id, product_type")
      .eq("id", entityId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("seo_landing_entity_not_found");
    return {
      id: data.id,
      slug: data.slug,
      title: data.name,
      tagline: data.tagline,
      description: data.description,
      coverMediaId: data.cover_media_id,
      destinationSlug: null,
      destinationName: null,
      categorySlug: data.product_type ?? null,
    };
  }

  const { data, error } = await supabase
    .from("points_of_interest")
    .select("id, slug, name, official_name, short_description, description, destination_id")
    .eq("id", entityId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("seo_landing_entity_not_found");
  const dest = data.destination_id
    ? await supabase
            .from("destinations")
            .select("slug, name")
            .eq("id", data.destination_id)
            .maybeSingle()
    : { data: null };
  return {
    id: data.id,
    slug: data.slug,
    title: data.official_name || data.name,
    tagline: data.short_description ?? null,
    description: data.description,
    coverMediaId: null,
    destinationSlug: dest?.data?.slug ?? null,
    destinationName: dest?.data?.name ?? null,
    categorySlug: null,
  };
}

/** URL canónica real de la ficha de origen (o `null` si aún no existe). */
function canonicalEntityUrl(
  entityType: SeoLandingEntityType,
  entity: EntitySnapshot,
): string | null {
  if (entityType === "business")
    return entity.destinationSlug && entity.categorySlug
      ? `/oriente-maya/${entity.destinationSlug}/${entity.categorySlug}/${entity.slug}`
      : null;
  if (entityType === "product") return `/producto/${entity.slug}`;
  return entity.destinationSlug
    ? `/oriente-maya/${entity.destinationSlug}/lugares/${entity.slug}`
    : null;
}

interface RealMediaItem {
  url: string;
  alt: string;
  role: string;
}

/**
 * Medios reales acreditados de la entidad. La URL pública se construye
 * exclusivamente con el contrato estable `toStablePublicMediaUrl`: si el
 * activo no vive en el bucket gobernado, se omite (fail-closed) — nunca se
 * arma una ruta a mano ni se firma una URL temporal.
 */
async function loadEntityMedia(
  supabase: Db,
  entityType: SeoLandingEntityType,
  entity: EntitySnapshot,
): Promise<RealMediaItem[]> {
  const select = "role, sort_order, media_assets:media_asset_id ( storage_bucket, storage_path, alt_text )";
  const query =
    entityType === "business"
      ? supabase.from("business_media").select(select).eq("business_id", entity.id)
      : entityType === "product"
        ? supabase.from("product_media").select(select).eq("product_id", entity.id)
        : supabase.from("place_media").select(select).eq("place_id", entity.id);
  const { data, error } = await query.order("sort_order", { ascending: true }).limit(12);
  if (error) return [];
  const items: RealMediaItem[] = [];
  for (const row of data ?? []) {
    const asset = row.media_assets as {
      storage_bucket?: string | null;
      storage_path?: string | null;
      alt_text?: string | null;
    } | null;
    const url = toStablePublicMediaUrl(asset?.storage_bucket, asset?.storage_path);
    if (!url) continue;
    const alt = (asset?.alt_text ?? "").trim();
    if (!alt) continue;
    items.push({ url, alt, role: String(row.role ?? "gallery") });
  }
  return items;
}

async function resolveCoverUrl(
  supabase: Db,
  mediaId: string | null,
): Promise<{ url: string; alt: string } | null> {
  if (!mediaId) return null;
  const { data } = await supabase
    .from("media_assets")
    .select("storage_bucket, storage_path, alt_text")
    .eq("id", mediaId)
    .maybeSingle();
  const url = toStablePublicMediaUrl(data?.storage_bucket, data?.storage_path);
  const alt = (data?.alt_text ?? "").trim();
  if (!url || !alt) return null;
  return { url, alt };
}

/** Slots reales: sin dato ⇒ sin slot (cero contenido inventado). */
async function buildRealSlots(
  supabase: Db,
  entityType: SeoLandingEntityType,
  entity: EntitySnapshot,
): Promise<Partial<Record<SeoLandingSlotId, SeoLandingSlotConfig | null>>> {
  const [cover, media] = await Promise.all([
    resolveCoverUrl(supabase, entity.coverMediaId),
    loadEntityMedia(supabase, entityType, entity),
  ]);
  const heroMedia = cover ?? media.find((m) => m.role === "cover") ?? media[0] ?? null;

  const hero: SeoLandingSlotConfig = { title: entity.title };
  if (entity.tagline) hero.description = entity.tagline;
  // Territorio primero: el eyebrow del hero identifica el destino real.
  if (entity.destinationName) hero.eyebrow = entity.destinationName;
  else if (entity.categorySlug) hero.eyebrow = entity.categorySlug;
  if (heroMedia) {
    hero.mediaUrl = heroMedia.url;
    hero.mediaAlt = heroMedia.alt;
  }

  const slots: Partial<Record<SeoLandingSlotId, SeoLandingSlotConfig | null>> = { hero };
  if (entity.description?.trim())
    slots.intro = { title: "Por qué visitar", body: entity.description.trim() };

  const gallery = media.filter((m) => m.url !== heroMedia?.url);
  if (gallery.length > 0)
    slots.gallery = {
      heading: "Galería",
      items: gallery.map((m) => ({ url: m.url, alt: m.alt })),
    };



  const canonical = canonicalEntityUrl(entityType, entity);
  if (canonical)
    slots.ctaBar = {
      actions: [
        { id: "add-to-trip", action: "add-to-trip", label: "Agregar a Mi Viaje" },
        { id: "view-entity", action: "navigate", label: "Ver ficha completa", href: canonical },
      ],
    };
  return slots;
}

/* ------------------------------------------------------------------ *
 * Resolución idempotente.
 * ------------------------------------------------------------------ */

async function findExistingLanding(
  supabase: Db,
  entityRef: string,
): Promise<ExistingSeoLandingRow | null> {
  const { data, error } = await supabase
    .from("page_compositions")
    .select("id, slug, title, status, published_at, current_draft")
    .eq("page_type", "landing")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const match = (data ?? []).find((row: CompositionRow) => {
    const chrome = (row.current_draft as { chrome?: SeoChromeShape } | null)?.chrome;
    const ref = chrome?.seo?.landing?.entityRef;
    return typeof ref === "string" && ref === entityRef;
  });
  if (!match) return null;
  return {
    id: match.id,
    slug: match.slug,
    title: match.title,
    status: match.status,
    published_at: match.published_at,
  };
}

export const resolveSeoLandingForEntity = createServerFn({ method: "GET" })
  .inputValidator((data: { entityType: SeoLandingEntityType; entityId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<SeoLandingResolution> => {
    const ref = buildSeoLandingEntityRef(data.entityType, data.entityId);
    const existing = await findExistingLanding(context.supabase, ref);
    return resolveSeoLandingState(existing);
  });

export const createSeoLandingDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { entityType: SeoLandingEntityType; entityId: string; refresh?: boolean }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      id: string;
      slug: string;
      created: boolean;
      refreshed: boolean;
      populatedSlots: string[];
    }> => {
      const supabase = context.supabase as Db;
      const ref = buildSeoLandingEntityRef(data.entityType, data.entityId);

      // 1 · Idempotencia: si ya existe, se devuelve la misma landing.
      const existing = await findExistingLanding(supabase, ref);
      if (existing && data.refresh !== true)
        return {
          id: existing.id,
          slug: existing.slug,
          created: false,
          refreshed: false,
          populatedSlots: [],
        };
      if (existing && (existing.status === "published" || existing.published_at))
        throw new Error("seo_landing_refresh_requires_draft");

      // 2 · Datos reales de la entidad de origen.
      const entity = await loadEntity(supabase, data.entityType, data.entityId);
      const slug = buildSeoLandingSlug(data.entityType, entity.slug, entity.id);
      const slots = await buildRealSlots(supabase, data.entityType, entity);
      const tree: CompositionTree = buildSeoLandingComposition({
        entityRef: ref,
        presentation: "editorial",
        idPrefix: `landing-${data.entityType}-${entity.slug}`,
        slots,
      });
      const seoPolicy = buildSeoLandingSeoPolicy(canonicalEntityUrl(data.entityType, entity));
      const populatedSlots =
        (tree.chrome as unknown as SeoChromeShape)?.seo?.landing?.populatedSlots ?? [];

      /* 2b · Regeneración desde datos reales de un borrador existente.
         Nunca duplica ni publica: reescribe el árbol y reafirma la política
         SEO por las mismas RPC gobernadas. */
      if (existing) {
        const { error: reErr } = await supabase.rpc("eb_save_composition_draft", {
          _id: existing.id,
          _tree: tree as never,
        });
        if (reErr) throw new Error(reErr.message);
        const { error: reMetaErr } = await supabase.rpc("eb_set_composition_seo_metadata", {
          _id: existing.id,
          _kind: "landing",
          _canonical_override: seoPolicy.canonicalOverride ?? undefined,
          _robots_directive: seoPolicy.robotsDirective,
        });
        if (reMetaErr) throw new Error(reMetaErr.message);
        return {
          id: existing.id,
          slug: existing.slug,
          created: false,
          refreshed: true,
          populatedSlots,
        };
      }

      // 3 · Creación del borrador (RPC gobernada: admin/editor).
      const { data: newId, error: createError } = await supabase.rpc("eb_create_composition", {
        _slug: slug,
        _title: entity.title,
        _description: entity.tagline ?? undefined,
        _page_type: "landing",
      });
      if (createError) throw new Error(createError.message);
      const id = String(newId);

      /* 4 · Árbol y metadatos SEO mediante las RPC gobernadas del Experience
         Builder. `authenticated` no tiene UPDATE directo sobre
         `page_compositions` (LOTE 3I): toda escritura pasa por RPC con
         verificación de rol y bitácora de contenido. */
      const { error: draftError } = await supabase.rpc("eb_save_composition_draft", {
        _id: id,
        _tree: tree as never,
      });
      if (draftError) throw new Error(draftError.message);

      const { error: metaError } = await supabase.rpc("eb_set_composition_seo_metadata", {
        _id: id,
        _kind: "landing",
        _canonical_override: seoPolicy.canonicalOverride ?? undefined,
        _robots_directive: seoPolicy.robotsDirective,
      });
      if (metaError) throw new Error(metaError.message);

      return { id, slug, created: true, refreshed: false, populatedSlots };
    },
  );

/* ------------------------------------------------------------------ *
 * Borradores legacy — diagnóstico y archivado transaccional.
 * ------------------------------------------------------------------ */

export const listLegacySeoLandingDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const slugs = LEGACY_SEO_LANDING_DRAFTS.map((d) => d.slug);
    const { data, error } = await (context.supabase as Db)
      .from("page_compositions")
      .select("id, slug, title, status, published_at")
      .in("slug", slugs);
    if (error) throw new Error(error.message);
    return LEGACY_SEO_LANDING_DRAFTS.map((entry) => {
      const row = (data ?? []).find((r) => r.slug === entry.slug) ?? null;
      return {
        ...entry,
        found: Boolean(row),
        id: row?.id ?? null,
        status: row?.status ?? null,
        publishedAt: row?.published_at ?? null,
        /** Sólo es archivable si nunca se publicó (fail-closed). */
        archivable: Boolean(row) && !row?.published_at && row?.status !== "published",
      };
    });
  });

export const archiveLegacySeoLandingDrafts = createServerFn({ method: "POST" })
  .inputValidator((data: { confirm: true }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (data.confirm !== true) throw new Error("seo_landing_archive_not_confirmed");
    const supabase = context.supabase as Db;
    const slugs = LEGACY_SEO_LANDING_DRAFTS.filter((d) => d.disposition === "archive").map(
      (d) => d.slug,
    );
    const { data: rows, error } = await supabase
      .from("page_compositions")
      .select("id, slug, status, published_at")
      .in("slug", slugs);
    if (error) throw new Error(error.message);

    const archived: string[] = [];
    const skipped: string[] = [];
    for (const row of rows ?? []) {
      if (row.published_at || row.status === "published") {
        skipped.push(row.slug);
        continue;
      }
      if (row.status === "archived") continue;
      /* 3I.1 · Archivado por RPC gobernada (`eb_archive_composition`):
         `authenticated` no tiene UPDATE directo sobre `page_compositions`.
         La RPC valida rol editorial y existencia antes de escribir. */
      const { error: upErr } = await supabase.rpc("eb_archive_composition", { _id: row.id });
      if (upErr) throw new Error(upErr.message);
      archived.push(row.slug);
    }
    return { archived, skipped };
  });
