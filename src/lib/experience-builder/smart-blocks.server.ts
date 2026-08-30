/**
 * Experience Builder · Smart Blocks Resolver — capa servidor
 * (G8-R1-F1J-HOME-PREMIUM-R2 · Fase 1).
 *
 * Causa raíz remediada: los contratos declaraban un esquema inexistente
 * (`short_description`, `hero_image_url`, `cover_image_url`, `name` en
 * empresas/eventos, `price`/`currency`, `is_featured`). PostgREST devolvía
 * 42703 y `SmartBlockRuntime` mostraba "No se pudieron cargar los datos
 * ahora". Aquí se declara la correspondencia ÚNICA entre el contrato
 * declarativo y el esquema físico real, y se adapta la fila al DTO que ya
 * consumen los renderers (sin renderer paralelo ni segunda fuente de datos).
 *
 * Invariantes:
 *   · Elegibilidad pública fail-closed: `status='published'`,
 *     `deleted_at IS NULL`, sin corpus demo (`PILOT_NON_DEMO_FILTER`) y,
 *     para empresas, `source_review_state='approved'`
 *     (autoridad única `@/lib/omxds/public-eligibility`).
 *   · URLs SIEMPRE desde `buildCanonicalEntityUrl` (DEF-F1I-002). Sin URL
 *     canónica resoluble, la tarjeta se muestra sin enlace.
 *   · Imágenes SIEMPRE desde `media_assets` (URL firmada). Los buckets son
 *     privados: no existen columnas `*_image_url`.
 */

import { createClient } from "@supabase/supabase-js";
import type { SmartBlockFilter, SmartBlockOrderBy, SmartBlockQuery } from "./block-contract";
import { PILOT_NON_DEMO_FILTER } from "@/lib/omxds/pilot-allowlist";
import { PUBLIC_APPROVED_REVIEW_STATE } from "@/lib/omxds/public-eligibility";
import { buildCanonicalEntityUrl } from "./canonical-entity-binding";

export type SmartBlockJsonValue =
  | string
  | number
  | boolean
  | null
  | SmartBlockJsonValue[]
  | { [k: string]: SmartBlockJsonValue };

export interface SmartBlockResolveResult {
  items: Array<Record<string, SmartBlockJsonValue>>;
  count: number;
  cached: boolean;
  error?: string;
}

type Row = Record<string, unknown>;

/** DTO adaptado que consumen los renderers (más el id de medio interno). */
type AdaptedItem = { [k: string]: SmartBlockJsonValue | string | undefined; _media?: string };

interface TableSpec {
  /** Proyección física real (incluye relaciones necesarias para la URL). */
  readonly select: string;
  /** Columnas físicas admitidas en filtros/orden declarados por contrato. */
  readonly filterable: ReadonlyArray<string>;
  /** Orden por defecto cuando el contrato no declara uno válido. */
  readonly defaultOrder?: { column: string; ascending: boolean };
  /** Adaptador fila física → DTO consumido por los renderers. */
  readonly adapt: (row: Row) => AdaptedItem | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function rel(row: Row, key: string): Row | null {
  const v = row[key];
  if (Array.isArray(v)) return (v[0] as Row) ?? null;
  return v && typeof v === "object" ? (v as Row) : null;
}

function isFeatured(row: Row): boolean {
  const meta = (row.metadata ?? null) as Record<string, unknown> | null;
  return meta?.featured === true || meta?.is_featured === true;
}

export const SMART_BLOCK_TABLES: Record<string, TableSpec> = {
  destinations: {
    select: "id, slug, name, tagline, hero_media_id, metadata",
    filterable: ["status", "deleted_at", "slug", "name"],
    defaultOrder: { column: "name", ascending: true },
    adapt: (row) => {
      const slug = str(row.slug);
      const name = str(row.name);
      if (!slug || !name) return null;
      return {
        id: str(row.id),
        slug,
        name,
        short_description: str(row.tagline),
        hero_image_url: null,
        href: buildCanonicalEntityUrl({ entityType: "destination", slug }),
        featured: isFeatured(row),
        _media: str(row.hero_media_id) ?? undefined,
      };
    },
  },
  businesses: {
    select:
      "id, slug, display_name, tagline, cover_media_id, logo_media_id, metadata, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug )",
    filterable: ["status", "deleted_at", "source_review_state", "slug", "display_name"],
    defaultOrder: { column: "display_name", ascending: true },
    adapt: (row) => {
      const slug = str(row.slug);
      const name = str(row.display_name);
      if (!slug || !name) return null;
      const destinationSlug = str(rel(row, "destinations")?.slug);
      const categorySlug = str(rel(row, "business_categories")?.slug);
      return {
        id: str(row.id),
        slug,
        name,
        short_description: str(row.tagline),
        cover_image_url: null,
        logo_url: null,
        href: buildCanonicalEntityUrl({
          entityType: "business",
          slug,
          destinationSlug,
          categorySlug,
        }),
        featured: isFeatured(row),
        _media: str(row.cover_media_id) ?? str(row.logo_media_id) ?? undefined,
      };
    },
  },
  products: {
    select:
      "id, slug, name, tagline, cover_media_id, price_amount, price_currency, metadata, businesses:business_id ( slug, status, deleted_at, source_review_state, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug ) )",
    filterable: ["status", "deleted_at", "slug", "name"],
    defaultOrder: { column: "name", ascending: true },
    adapt: (row) => {
      const slug = str(row.slug);
      const name = str(row.name);
      if (!slug || !name) return null;
      const biz = rel(row, "businesses");
      // Fail-closed: la empresa contenedora debe ser pública y acreditada.
      if (
        !biz ||
        biz.status !== "published" ||
        biz.deleted_at != null ||
        biz.source_review_state !== PUBLIC_APPROVED_REVIEW_STATE
      ) {
        return null;
      }
      const priceRaw = row.price_amount;
      return {
        id: str(row.id),
        slug,
        name,
        short_description: str(row.tagline),
        cover_image_url: null,
        price: typeof priceRaw === "number" ? priceRaw : null,
        currency: str(row.price_currency),
        href: buildCanonicalEntityUrl({
          entityType: "product",
          slug,
          businessSlug: str(biz.slug),
          destinationSlug: str(rel(biz, "destinations")?.slug),
          categorySlug: str(rel(biz, "business_categories")?.slug),
        }),
        featured: isFeatured(row),
        _media: str(row.cover_media_id) ?? undefined,
      };
    },
  },
  events: {
    select: "id, slug, title, summary, cover_media_id, starts_at, ends_at",
    filterable: ["status", "deleted_at", "slug", "starts_at", "ends_at"],
    defaultOrder: { column: "starts_at", ascending: true },
    adapt: (row) => {
      const slug = str(row.slug);
      const name = str(row.title);
      if (!slug || !name) return null;
      return {
        id: str(row.id),
        slug,
        name,
        short_description: str(row.summary),
        cover_image_url: null,
        starts_at: str(row.starts_at),
        ends_at: str(row.ends_at),
        href: buildCanonicalEntityUrl({ entityType: "event", slug }),
        featured: false,
        _media: str(row.cover_media_id) ?? undefined,
      };
    },
  },
};

const ALLOWED_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "ilike"]);
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 12;
const CACHE_TTL_MS = 60_000;

type CacheEntry = { at: number; value: SmartBlockResolveResult };
const cache = new Map<string, CacheEntry>();

function getPublicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public client env missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function applyFilter(builder: any, spec: TableSpec, f: SmartBlockFilter): any {
  if (!ALLOWED_OPS.has(f.op)) return builder;
  if (!spec.filterable.includes(f.column)) return builder;
  if (f.op === "in") {
    if (!Array.isArray(f.value)) return builder;
    return builder.in(f.column, f.value);
  }
  if (f.op === "ilike") return builder.ilike(f.column, String(f.value));
  return (builder as any)[f.op](f.column, f.value);
}

function applyOrder(builder: any, spec: TableSpec, o: SmartBlockOrderBy): any {
  if (!spec.filterable.includes(o.column)) return builder;
  return builder.order(o.column, { ascending: (o.direction ?? "asc") === "asc" });
}

/** Firma en lote las imágenes de portada (buckets privados). */
async function signMedia(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .select("id, storage_bucket, storage_path")
      .in("id", ids);
    if (error || !data) return out;
    const byBucket = new Map<string, Array<{ id: string; path: string }>>();
    for (const m of data as Array<Row>) {
      const bucket = str(m.storage_bucket);
      const path = str(m.storage_path);
      const id = str(m.id);
      if (!bucket || !path || !id) continue;
      const list = byBucket.get(bucket) ?? [];
      list.push({ id, path });
      byBucket.set(bucket, list);
    }
    for (const [bucket, list] of byBucket) {
      const { data: signed } = await supabaseAdmin.storage.from(bucket).createSignedUrls(
        list.map((l) => l.path),
        60 * 60,
      );
      (signed ?? []).forEach((s, i) => {
        const entry = list[i];
        if (entry && s?.signedUrl) out.set(entry.id, s.signedUrl);
      });
    }
  } catch {
    /* fail-open sobre imagen: la tarjeta se muestra sin fotografía. */
  }
  return out;
}

/** Resuelve una `SmartBlockQuery` declarativa contra el esquema real. */
export async function resolveSmartBlockQuery(q: SmartBlockQuery): Promise<SmartBlockResolveResult> {
  try {
    const spec = q?.table ? SMART_BLOCK_TABLES[q.table] : undefined;
    if (!spec) return { items: [], count: 0, cached: false, error: "table not allowed" };

    const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? DEFAULT_LIMIT));
    const key = JSON.stringify({ t: q.table, f: q.filters, o: q.order_by, limit });
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, cached: true };

    const client = getPublicClient();
    let builder: any = client.from(q.table).select(spec.select);

    // Elegibilidad pública fail-closed (no negociable por contrato).
    builder = builder.eq("status", "published").is("deleted_at", null);
    if (q.table === "businesses") {
      builder = builder.eq("source_review_state", PUBLIC_APPROVED_REVIEW_STATE);
    }
    if (q.table !== "events") builder = builder.or(PILOT_NON_DEMO_FILTER);

    for (const f of q.filters ?? []) {
      if (f.column === "status" || f.column === "deleted_at") continue;
      builder = applyFilter(builder, spec, f);
    }
    let ordered: boolean = false;
    for (const o of q.order_by ?? []) {
      builder = applyOrder(builder, spec, o);
      if (spec.filterable.includes(o.column)) ordered = true;
    }
    if (!ordered && spec.defaultOrder) {
      builder = builder.order(spec.defaultOrder.column, {
        ascending: spec.defaultOrder.ascending,
      });
    }
    // Se pide de más porque el adaptador descarta filas no elegibles.
    builder = builder.limit(Math.min(MAX_LIMIT, limit * 3));

    const { data: rows, error } = await builder;
    if (error) return { items: [], count: 0, cached: false, error: error.message };

    const adapted = ((rows ?? []) as Row[])
      .map((r) => spec.adapt(r))
      .filter((r): r is AdaptedItem => r !== null);

    // "Destacado" es ranking, no filtro duro: nunca deja una sección vacía.
    adapted.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
    const page = adapted.slice(0, limit);

    const media = await signMedia(
      Array.from(new Set(page.map((i) => i._media).filter((v): v is string => !!v))),
    );

    const items = page.map((i) => {
      const { _media, ...rest } = i;
      const url = _media ? (media.get(_media) ?? null) : null;
      if (url) {
        if ("hero_image_url" in rest) rest.hero_image_url = url;
        if ("cover_image_url" in rest) rest.cover_image_url = url;
      }
      return rest as Record<string, SmartBlockJsonValue>;
    });

    const value: SmartBlockResolveResult = { items, count: items.length, cached: false };
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    return {
      items: [],
      count: 0,
      cached: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/* ------------------------------------------------------------------ *
 * G8-R1-F1J-HOME-PREMIUM-R2 · Mapa territorial (`vmx.experience.map`)
 * El bloque de Home no declara `points` en su configuración: sus puntos
 * son el corpus real publicado. Se resuelven aquí, con la MISMA autoridad
 * de elegibilidad y de URL canónica que el resto de Smart Blocks.
 * ------------------------------------------------------------------ */

export interface TerritoryMapPoint {
  id: string;
  kind: "business" | "destination";
  lat: number;
  lng: number;
  title: string;
  subtitle: string | null;
  href: string | null;
}

const MAP_CACHE_TTL_MS = 60_000;
let mapCache: { at: number; value: TerritoryMapPoint[] } | null = null;

/** Puntos reales del territorio: empresas acreditadas con coordenadas. */
export async function resolveTerritoryMapPointsQuery(limit = 60): Promise<TerritoryMapPoint[]> {
  if (mapCache && Date.now() - mapCache.at < MAP_CACHE_TTL_MS) return mapCache.value;
  try {
    const client = getPublicClient();
    const { data, error } = await client
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug ), business_locations ( latitude, longitude )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("source_review_state", PUBLIC_APPROVED_REVIEW_STATE)
      .or(PILOT_NON_DEMO_FILTER)
      .limit(Math.min(200, Math.max(1, limit)));
    if (error || !data) return [];

    const points: TerritoryMapPoint[] = [];
    for (const row of data as Row[]) {
      const slug = str(row.slug);
      const title = str(row.display_name);
      const loc = rel(row, "business_locations");
      const lat = Number(loc?.latitude);
      const lng = Number(loc?.longitude);
      if (!slug || !title || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      points.push({
        id: str(row.id) ?? slug,
        kind: "business",
        lat,
        lng,
        title,
        subtitle: str(row.tagline),
        href: buildCanonicalEntityUrl({
          entityType: "business",
          slug,
          destinationSlug: str(rel(row, "destinations")?.slug),
          categorySlug: str(rel(row, "business_categories")?.slug),
        }),
      });
    }
    mapCache = { at: Date.now(), value: points };
    return points;
  } catch {
    return [];
  }
}
