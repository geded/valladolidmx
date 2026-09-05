/**
 * LOTE 3I · Sección central CMS "Landing SEO".
 *
 * Server functions de SÓLO LECTURA + selector de entidad canónica para la
 * administración centralizada de la familia `premium-seo-landing`.
 *
 * Reglas vinculantes:
 *  - Reutiliza el modelo existente `page_compositions` (`page_type=landing`)
 *    y el metadato editorial `chrome.seo.landing`. Cero tablas nuevas.
 *  - La creación sigue siendo la de `seo-landing-creation.functions.ts`
 *    (idempotente). Aquí no se crea ni se publica nada.
 *  - Autorización efectiva por `requireSupabaseAuth` + RLS.
 *  - Cero contenido inventado: los campos sin dato real viajan como `null`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readSeoLandingChrome } from "./seo-landing-template";
import type { CompositionTree } from "../composition-tree";
import {
  LEGACY_SEO_LANDING_DRAFTS,
  parseSeoLandingEntityRef,
  type SeoLandingEntityType,
} from "./seo-landing-creation";

type Db = SupabaseClient<Database>;

export interface SeoLandingAdminRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly workflowState: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly canonical: string | null;
  readonly robots: string;
  readonly template: string | null;
  readonly variant: string | null;
  readonly populatedSlots: number;
  readonly entityType: SeoLandingEntityType | null;
  readonly entityId: string | null;
  readonly entityName: string | null;
  readonly entitySlug: string | null;
  readonly destinationSlug: string | null;
  /** `true` para las landings legacy previas a la familia canónica. */
  readonly legacy: boolean;
}

const LEGACY_SLUGS = new Set(LEGACY_SEO_LANDING_DRAFTS.map((d) => d.slug));

interface EntityInfo {
  name: string;
  slug: string;
  destinationId: string | null;
}

async function resolveEntities(
  supabase: Db,
  refs: { entityType: SeoLandingEntityType; entityId: string }[],
): Promise<Map<string, EntityInfo>> {
  const out = new Map<string, EntityInfo>();
  const ids = (t: SeoLandingEntityType) =>
    refs.filter((r) => r.entityType === t).map((r) => r.entityId);

  const businessIds = ids("business");
  if (businessIds.length) {
    const { data } = await supabase
      .from("businesses")
      .select("id, slug, display_name, destination_id")
      .in("id", businessIds);
    for (const row of data ?? [])
      out.set(`business:${row.id}`, {
        name: row.display_name,
        slug: row.slug,
        destinationId: row.destination_id,
      });
  }

  const productIds = ids("product");
  if (productIds.length) {
    const { data } = await supabase.from("products").select("id, slug, name").in("id", productIds);
    for (const row of data ?? [])
      out.set(`product:${row.id}`, { name: row.name, slug: row.slug, destinationId: null });
  }

  const placeIds = ids("place");
  if (placeIds.length) {
    const { data } = await supabase
      .from("points_of_interest")
      .select("id, slug, name, official_name, destination_id")
      .in("id", placeIds);
    for (const row of data ?? [])
      out.set(`place:${row.id}`, {
        name: row.official_name || row.name,
        slug: row.slug,
        destinationId: row.destination_id,
      });
  }

  return out;
}

async function destinationSlugs(
  supabase: Db,
  destinationIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(destinationIds.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await supabase.from("destinations").select("id, slug").in("id", unique);
  for (const row of data ?? []) map.set(row.id, row.slug);
  return map;
}

/** Listado administrable de todas las Landing SEO (`page_type=landing`). */
export const listSeoLandingsCms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: SeoLandingAdminRow[] }> => {
    const supabase = context.supabase as Db;
    const { data, error } = await supabase
      .from("page_compositions")
      .select(
        "id, slug, title, status, workflow_state, published_at, updated_at, canonical_override, robots_directive, current_draft",
      )
      .eq("page_type", "landing")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const raw = (data ?? []).map((row) => {
      const chrome = readSeoLandingChrome((row.current_draft ?? null) as CompositionTree | null);
      const ref = chrome ? parseSeoLandingEntityRef(chrome.entityRef) : null;
      return { row, chrome, ref };
    });

    const entities = await resolveEntities(
      supabase,
      raw.map((r) => r.ref).filter((r): r is NonNullable<typeof r> => Boolean(r)),
    );
    const destSlugs = await destinationSlugs(
      supabase,
      [...entities.values()].map((e) => e.destinationId ?? ""),
    );

    const rows: SeoLandingAdminRow[] = raw.map(({ row, chrome, ref }) => {
      const info = ref ? (entities.get(`${ref.entityType}:${ref.entityId}`) ?? null) : null;
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        workflowState: row.workflow_state,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        canonical: row.canonical_override,
        robots: row.robots_directive,
        template: chrome?.template ?? null,
        variant: chrome?.variant ?? null,
        populatedSlots: chrome?.populatedSlots.length ?? 0,
        entityType: ref?.entityType ?? null,
        entityId: ref?.entityId ?? null,
        entityName: info?.name ?? null,
        entitySlug: info?.slug ?? null,
        destinationSlug: info?.destinationId ? (destSlugs.get(info.destinationId) ?? null) : null,
        legacy: !chrome && LEGACY_SLUGS.has(row.slug),
      };
    });

    return { rows };
  });

export interface SeoLandingEntityCandidate {
  readonly entityType: SeoLandingEntityType;
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

/** Selector de entidad canónica para "Crear Landing SEO" desde la sección. */
export const searchSeoLandingEntities = createServerFn({ method: "GET" })
  .inputValidator((data: { entityType: SeoLandingEntityType; search?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ items: SeoLandingEntityCandidate[] }> => {
    const supabase = context.supabase as Db;
    const term = (data.search ?? "").trim();

    if (data.entityType === "business") {
      let q = supabase
        .from("businesses")
        .select("id, slug, display_name")
        .is("deleted_at", null)
        .order("display_name")
        .limit(30);
      if (term) q = q.ilike("display_name", `%${term}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return {
        items: (rows ?? []).map((r) => ({
          entityType: "business" as const,
          id: r.id,
          slug: r.slug,
          name: r.display_name,
        })),
      };
    }

    if (data.entityType === "product") {
      let q = supabase
        .from("products")
        .select("id, slug, name")
        .is("deleted_at", null)
        .order("name")
        .limit(30);
      if (term) q = q.ilike("name", `%${term}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return {
        items: (rows ?? []).map((r) => ({
          entityType: "product" as const,
          id: r.id,
          slug: r.slug,
          name: r.name,
        })),
      };
    }

    let q = supabase
      .from("points_of_interest")
      .select("id, slug, name, official_name")
      .is("deleted_at", null)
      .order("name")
      .limit(30);
    if (term) q = q.ilike("name", `%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: (rows ?? []).map((r) => ({
        entityType: "place" as const,
        id: r.id,
        slug: r.slug,
        name: r.official_name || r.name,
      })),
    };
  });
