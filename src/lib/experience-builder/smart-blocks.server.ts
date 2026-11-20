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
import { isAccreditedDestinationMedia } from "@/lib/destinations/public-media-policy";
import {
  STABLE_PUBLIC_MEDIA_BUCKET,
  STABLE_PUBLIC_MEDIA_PREFIX,
  toStablePublicMediaUrl,
} from "@/lib/media/stable-public-url";
import { toDerivedPublicMediaUrl } from "@/lib/media/derived-public-url";
import type { MediaAssetInput, MediaVariantInput } from "@/lib/media/resolve-source";
import { HOME_PREMIUM_MEDIA } from "@/components/home-premium/home-premium-content";

/** URLs estables ya aprobadas del fixture editorial de la portada. */
const HOME_PREMIUM_STABLE_MEDIA_URLS: string[] = Object.values(HOME_PREMIUM_MEDIA).map(
  (m) => m.url,
);
import { readPublishedRouteCards } from "@/lib/routes-editorial/route-public-reads.server";
import {
  nextEventOccurrence,
  normalizeExceptionDates,
  normalizeScheduleTimes,
  toRecurrencePayload,
} from "@/lib/events/recurrence";
import type { EventRecurrenceInput, EventRecurrencePayload } from "@/lib/events/recurrence";
import {
  routeDifficultyLabel,
  routeDurationLabel,
  routePaceLabel,
  routePublicPath,
} from "@/lib/routes-editorial/route-public-contract";

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
        category_slug: categorySlug,
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
      "id, slug, name, tagline, cover_media_id, price_amount, price_currency, metadata, businesses:business_id ( id, slug, status, deleted_at, source_review_state, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug ) )",
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
        business_id: str(biz.id),
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
    select:
      "id, slug, title, summary, cover_media_id, starts_at, ends_at, recurrence_frequency, recurrence_interval, recurrence_weekdays, recurrence_until, schedule_times, exception_dates, event_timezone",
    filterable: ["status", "deleted_at", "slug", "starts_at", "ends_at"],
    defaultOrder: { column: "starts_at", ascending: true },
    adapt: (row) => {
      const slug = str(row.slug);
      const name = str(row.title);
      if (!slug || !name) return null;
      const recurrenceInput: EventRecurrenceInput = {
        starts_at: str(row.starts_at) ?? "",
        ends_at: str(row.ends_at),
        recurrence_frequency:
          row.recurrence_frequency === "daily" ||
          row.recurrence_frequency === "weekly" ||
          row.recurrence_frequency === "monthly" ||
          row.recurrence_frequency === "yearly"
            ? row.recurrence_frequency
            : null,
        recurrence_interval:
          typeof row.recurrence_interval === "number" ? row.recurrence_interval : 1,
        recurrence_weekdays: Array.isArray(row.recurrence_weekdays)
          ? row.recurrence_weekdays.filter((day): day is number => typeof day === "number")
          : [],
        recurrence_until: str(row.recurrence_until),
        schedule_times: normalizeScheduleTimes(row.schedule_times),
        exception_dates: normalizeExceptionDates(row.exception_dates),
        event_timezone: str(row.event_timezone) ?? "America/Merida",
      };
      const next = nextEventOccurrence(recurrenceInput);
      if (!next) return null;
      return {
        id: str(row.id),
        slug,
        name,
        short_description: str(row.summary),
        cover_image_url: null,
        starts_at: next.startsAt,
        ends_at: row.recurrence_frequency ? null : str(row.ends_at),
        href: buildCanonicalEntityUrl({ entityType: "event", slug }),
        featured: false,
        recurrence: { ...toRecurrencePayload(recurrenceInput) },
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

/**
 * H3·A4 · Carga en lote de assets + variantes `ready` para las URLs públicas
 * estables que ya usa la portada. No cambia ninguna URL canónica: sólo añade
 * las versiones ligeras que `resolveMediaSource()` podrá ofrecer vía
 * `<picture>`. Fail-closed: cualquier error devuelve un mapa vacío y la
 * superficie conserva exactamente el original de hoy.
 */
/** Prefijo editorial gobernado que la portada resuelve en cliente. */
const GOVERNED_MEDIA_PATH_PREFIX = "governed/v1p1c/";

/** Extrae la ruta de almacenamiento de una URL estable o firmada del bucket. */
function toStableMediaPath(url: string): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  const clean = url.split("?")[0] ?? url;
  if (clean.startsWith(STABLE_PUBLIC_MEDIA_PREFIX)) {
    return clean.slice(STABLE_PUBLIC_MEDIA_PREFIX.length) || null;
  }
  const marker = `/${STABLE_PUBLIC_MEDIA_BUCKET}/`;
  const at = clean.indexOf(marker);
  if (at >= 0) return clean.slice(at + marker.length) || null;
  return null;
}

export async function resolveStableMediaAssets(
  stableUrls: string[],
): Promise<Record<string, MediaAssetInput>> {
  const out: Record<string, MediaAssetInput> = {};
  const { isMediaPipelineEnabled } = await import("@/lib/media/pipeline-flag.server");
  if (!(await isMediaPipelineEnabled())) return out;
  /* Una misma ruta puede llegar como URL estable o como URL firmada ya
     resuelta: conservamos todas las claves para que la superficie encuentre
     su asset sin cambiar ninguna URL canónica. */
  const pathToUrls = new Map<string, Set<string>>();
  for (const url of stableUrls) {
    const path = toStableMediaPath(url);
    if (!path) continue;
    const set = pathToUrls.get(path) ?? new Set<string>();
    set.add(url);
    pathToUrls.set(path, set);
  }
  const paths = Array.from(pathToUrls.keys());
  try {
    const client = getPublicClient();
    const baseSelect =
      "id, storage_bucket, storage_path, width, height, mime_type, pipeline_status";
    const [listed, governed] = await Promise.all([
      paths.length > 0
        ? client
            .from("media_assets")
            .select(baseSelect)
            .eq("storage_bucket", STABLE_PUBLIC_MEDIA_BUCKET)
            .eq("status", "published")
            .is("deleted_at", null)
            .in("storage_path", paths)
        : Promise.resolve({ data: [], error: null }),
      /* El bloque editorial gobernado compone sus URLs en cliente, así que
         sus assets se cargan por prefijo y no por lista. */
      client
        .from("media_assets")
        .select(baseSelect)
        .eq("storage_bucket", STABLE_PUBLIC_MEDIA_BUCKET)
        .eq("status", "published")
        .is("deleted_at", null)
        .like("storage_path", `${GOVERNED_MEDIA_PATH_PREFIX}%`),
    ]);
    const assets = [...(listed.data ?? []), ...(governed.data ?? [])];
    if (assets.length === 0) return out;

    const ready = assets.filter((a) => a.pipeline_status === "ready");
    if (ready.length === 0) return out;

    const { data: variants } = await client
      .from("media_asset_variants")
      .select("asset_id, bucket, path, format, width, height, bytes, status, usage_context")
      .in(
        "asset_id",
        ready.map((a) => a.id),
      )
      .eq("status", "ready")
      .eq("is_current", true);

    const byAsset = new Map<string, MediaVariantInput[]>();
    for (const v of variants ?? []) {
      const url = toDerivedPublicMediaUrl(v.bucket, v.path);
      if (!url) continue;
      const list = byAsset.get(v.asset_id) ?? [];
      list.push({
        format: v.format as MediaVariantInput["format"],
        width: Number(v.width),
        height: v.height ?? null,
        url,
        bytes: v.bytes ?? null,
        status: "ready",
        usage_context: (v.usage_context ?? null) as MediaVariantInput["usage_context"],
      });
      byAsset.set(v.asset_id, list);
    }

    for (const asset of ready) {
      const stableUrl = toStablePublicMediaUrl(asset.storage_bucket, asset.storage_path);
      const list = byAsset.get(asset.id);
      if (!stableUrl || !list || list.length === 0) continue;
      const entry: MediaAssetInput = {
        id: asset.id,
        file_url: stableUrl,
        original_width: asset.width ?? null,
        original_height: asset.height ?? null,
        original_mime: asset.mime_type ?? null,
        pipeline_status: "ready",
        variants: list,
      };
      out[stableUrl] = entry;
      for (const url of pathToUrls.get(asset.storage_path) ?? []) {
        out[url] = entry;
      }
    }
  } catch {
    /* Fail-closed: sin variantes, la portada sirve el original de siempre. */
  }
  return out;
}

/**
 * Constructor de consulta estructural mínimo: evita `any` conservando el
 * encadenamiento de PostgREST sin acoplarse a los genéricos del SDK.
 */
type QueryBuilder = {
  [op: string]: (...args: unknown[]) => QueryBuilder;
};

function applyFilter(builder: QueryBuilder, spec: TableSpec, f: SmartBlockFilter): QueryBuilder {
  if (!ALLOWED_OPS.has(f.op)) return builder;
  if (!spec.filterable.includes(f.column)) return builder;
  if (f.op === "in") {
    if (!Array.isArray(f.value)) return builder;
    return builder.in(f.column, f.value);
  }
  if (f.op === "ilike") return builder.ilike(f.column, String(f.value));
  const apply = builder[f.op];
  return typeof apply === "function" ? apply.call(builder, f.column, f.value) : builder;
}

function applyOrder(builder: QueryBuilder, spec: TableSpec, o: SmartBlockOrderBy): QueryBuilder {
  if (!spec.filterable.includes(o.column)) return builder;
  return builder.order(o.column, { ascending: (o.direction ?? "asc") === "asc" });
}

/**
 * Resuelve en lote las portadas acreditadas a la URL pública estable canónica.
 *
 * El proxy `/api/public/studio-media/*` firma el objeto al momento de servirlo;
 * el resolutor de la Home no necesita ni debe depender de la service role. Así
 * Lovable preview y producción consumen exactamente el mismo contrato público.
 */
async function resolveStableMedia(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  try {
    const { data, error } = await getPublicClient()
      .from("media_assets")
      .select(
        "id, storage_bucket, storage_path, status, deleted_at, is_demo_seed, review_state, pipeline_status, original_checksum, alt_text, credit, metadata",
      )
      .in("id", ids);
    if (error || !data) return out;
    for (const m of data as Array<Row>) {
      const id = str(m.id);
      const bucket = str(m.storage_bucket);
      const path = str(m.storage_path);
      if (!id || !bucket || !path) continue;
      const accredited = isAccreditedDestinationMedia({
        storage_bucket: bucket,
        storage_path: path,
        status: str(m.status),
        deleted_at: str(m.deleted_at),
        is_demo_seed: m.is_demo_seed === true,
        review_state: str(m.review_state),
        pipeline_status: str(m.pipeline_status),
        original_checksum: str(m.original_checksum),
        alt_text: str(m.alt_text),
        credit: str(m.credit),
        metadata: m.metadata,
      });
      if (!accredited) continue;
      const stableUrl = toStablePublicMediaUrl(bucket, path);
      if (stableUrl) {
        out.set(id, stableUrl);
      } else if (bucket === "destinations") {
        // Portadas de destino subidas desde el CMS viven en el bucket privado
        // de destinos: se firman igual que en la ficha pública del destino.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: signed } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 6);
          if (signed?.signedUrl) out.set(id, signed.signedUrl);
        } catch {
          /* fail-closed: la tarjeta conserva su contenido sin medio */
        }
      }
    }
  } catch {
    /* Fail-closed sobre imagen: la tarjeta conserva su contenido sin medio. */
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
    let builder = client.from(q.table).select(spec.select) as unknown as QueryBuilder;

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

    const { data: rows, error } = (await (builder as unknown as PromiseLike<{
      data: Row[] | null;
      error: { message: string } | null;
    }>)) ?? { data: null, error: null };
    if (error) return { items: [], count: 0, cached: false, error: error.message };

    const adapted = ((rows ?? []) as Row[])
      .map((r) => spec.adapt(r))
      .filter((r): r is AdaptedItem => r !== null);

    // "Destacado" es ranking, no filtro duro: nunca deja una sección vacía.
    adapted.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
    const page = adapted.slice(0, limit);

    const media = await resolveStableMedia(
      Array.from(new Set(page.map((i) => i._media).filter((v): v is string => !!v))),
    );

    const mediaAssets = await resolveStableMediaAssets(Array.from(media.values()));
    const items = page.map((i) => {
      const { _media, ...rest } = i;
      const url = _media ? (media.get(_media) ?? null) : null;
      if (url) {
        if (mediaAssets[url]) rest.media_asset = mediaAssets[url] as unknown as SmartBlockJsonValue;
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

/** Puntos reales del territorio: destinos y empresas acreditadas con coordenadas. */
export async function resolveTerritoryMapPointsQuery(limit = 60): Promise<TerritoryMapPoint[]> {
  if (mapCache && Date.now() - mapCache.at < MAP_CACHE_TTL_MS) return mapCache.value;
  try {
    const client = getPublicClient();
    const [destinationsResult, businessesResult] = await Promise.all([
      client
        .from("destinations")
        .select("id, slug, name, tagline, latitude, longitude")
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(Math.min(50, Math.max(1, limit))),
      client
        .from("businesses")
        .select(
          "id, slug, display_name, tagline, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug ), business_locations ( latitude, longitude )",
        )
        .eq("status", "published")
        .is("deleted_at", null)
        .eq("source_review_state", PUBLIC_APPROVED_REVIEW_STATE)
        .or(PILOT_NON_DEMO_FILTER)
        .limit(Math.min(200, Math.max(1, limit))),
    ]);
    if (destinationsResult.error || businessesResult.error) return [];

    const points: TerritoryMapPoint[] = [];
    for (const row of (destinationsResult.data ?? []) as Row[]) {
      const slug = str(row.slug);
      const title = str(row.name);
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!slug || !title || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      points.push({
        id: str(row.id) ?? slug,
        kind: "destination",
        lat,
        lng,
        title,
        subtitle: str(row.tagline),
        href: `/oriente-maya/${slug}`,
      });
    }
    for (const row of (businessesResult.data ?? []) as Row[]) {
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

/**
 * Paradas reales de cada ruta editorial con coordenadas acreditadas.
 *
 * El mapa del Home dibujaba sólo los DESTINOS de la ruta, por lo que las
 * paradas intermedias publicadas (lugares como Cenote Zací o Suytun y
 * empresas como Yerbabuena del Sisal) no aparecían. Aquí se resuelven las
 * paradas reales de `editorial_route_stops` en su orden editorial, con la
 * misma elegibilidad pública fail-closed. Sin coordenadas publicadas, la
 * parada simplemente no se dibuja: nunca se inventa una ubicación.
 */
async function resolveRouteStopPoints(
  routeIds: string[],
): Promise<Map<string, TerritoryMapPoint[]>> {
  const out = new Map<string, TerritoryMapPoint[]>();
  const ids = Array.from(new Set(routeIds.filter(Boolean)));
  if (!ids.length) return out;
  try {
    const client = getPublicClient();
    const { data: stops, error } = await client
      .from("editorial_route_stops")
      .select("route_id, position, entity_kind, entity_id, title")
      .in("route_id", ids)
      .order("position", { ascending: true });
    if (error) return out;
    const rows = (stops ?? []) as Row[];
    const idsOf = (kind: string) =>
      Array.from(
        new Set(
          rows
            .filter((r) => str(r.entity_kind) === kind && r.entity_id)
            .map((r) => String(r.entity_id)),
        ),
      );
    const destIds = idsOf("destination");
    const placeIds = idsOf("place");
    const bizIds = idsOf("business");

    const [destRes, placeRes, bizRes] = await Promise.all([
      destIds.length
        ? client
            .from("destinations")
            .select("id, slug, name, latitude, longitude")
            .in("id", destIds)
            .eq("status", "published")
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      placeIds.length
        ? client
            .from("points_of_interest")
            .select("id, slug, name, latitude, longitude, destinations:destination_id ( slug )")
            .in("id", placeIds)
            .eq("status", "published")
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      bizIds.length
        ? client
            .from("businesses")
            .select(
              "id, slug, display_name, destinations:destination_id ( slug ), business_categories:primary_category_id ( slug ), business_locations ( latitude, longitude )",
            )
            .in("id", bizIds)
            .eq("status", "published")
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const byId = new Map<string, TerritoryMapPoint>();
    for (const row of (destRes.data ?? []) as Row[]) {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      const slug = str(row.slug);
      if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      byId.set(String(row.id), {
        id: String(row.id),
        kind: "destination",
        lat,
        lng,
        title: str(row.name) ?? slug,
        subtitle: null,
        href: `/oriente-maya/${slug}`,
      });
    }
    for (const row of (placeRes.data ?? []) as Row[]) {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      const slug = str(row.slug);
      const destSlug = str(rel(row, "destinations")?.slug);
      if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      byId.set(String(row.id), {
        // El contrato del bloque de mapa no declara `place`; el lugar se
        // representa como punto territorial sin inventar otra familia.
        id: String(row.id),
        kind: "destination",
        lat,
        lng,
        title: str(row.name) ?? slug,
        subtitle: null,
        href: destSlug ? `/oriente-maya/${destSlug}/lugares/${slug}` : null,
      });
    }
    for (const row of (bizRes.data ?? []) as Row[]) {
      const loc = rel(row, "business_locations");
      const lat = Number(loc?.latitude);
      const lng = Number(loc?.longitude);
      const slug = str(row.slug);
      if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      byId.set(String(row.id), {
        id: String(row.id),
        kind: "business",
        lat,
        lng,
        title: str(row.display_name) ?? slug,
        subtitle: null,
        href: buildCanonicalEntityUrl({
          entityType: "business",
          slug,
          destinationSlug: str(rel(row, "destinations")?.slug),
          categorySlug: str(rel(row, "business_categories")?.slug),
        }),
      });
    }

    for (const row of rows) {
      const routeId = String(row.route_id);
      const entityId = row.entity_id ? String(row.entity_id) : null;
      const point = entityId ? byId.get(entityId) : null;
      if (!point) continue;
      const list = out.get(routeId) ?? [];
      if (!list.some((p) => p.id === point.id)) list.push(point);
      out.set(routeId, list);
    }
    return out;
  } catch {
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * G8-R1-F1L-R2 · Corpus real de la Home premium (`vmx.home.premium-g4`)
 *
 * El fixture editorial no declara tarjetas: destinos, experiencias,
 * hospedaje, gastronomía, eventos y rutas provienen EXCLUSIVAMENTE del
 * corpus publicado y acreditado, con la misma autoridad de elegibilidad
 * y de URL canónica que el resto de Smart Blocks. Sin fotografía
 * acreditada, `media.url` queda vacío y la superficie renderiza el
 * marcador editorial neutral. Nunca se inventan datos ni rutas.
 * ------------------------------------------------------------------ */

export interface HomeRealCard {
  /** Empresa operadora acreditada, cuando la fuente la declara. */
  businessId: string | null;
  title: string;
  subtitle: string;
  category: string;
  href: string;
  mediaUrl: string;
  puebloMagico: boolean;
}

export interface HomeRealRoute {
  id: string;
  title: string;
  duration: string;
  stops: number;
  vibe: string;
  description: string;
  sequence: string[];
  /** Paradas reales publicadas con coordenadas, en orden editorial. */
  stopPoints: TerritoryMapPoint[];
  href: string;
  mediaUrl: string;
}

export interface HomeRealContent {
  destinos: HomeRealCard[];
  experiencias: HomeRealCard[];
  stays: HomeRealCard[];
  food: HomeRealCard[];
  eventos: Array<
    HomeRealCard & {
      day: string;
      startsAt: string | null;
      recurrence: EventRecurrencePayload | null;
    }
  >;
  rutas: HomeRealRoute[];
  mapPoints: TerritoryMapPoint[];
  /**
   * H3·A4 · Versiones ligeras (AVIF/WebP/JPEG) disponibles por URL pública
   * estable. Aditivo: si falta una entrada, la superficie sirve el original.
   */
  mediaAssets: Record<string, MediaAssetInput>;
}

/** Pueblos Mágicos del Oriente Maya (registro configurable, G8/H-03). */
const PUEBLOS_MAGICOS = new Set(["valladolid", "izamal", "espita"]);

const HOME_CACHE_TTL_MS = 60_000;
let homeCache: { at: number; value: HomeRealContent } | null = null;

const EMPTY_HOME: HomeRealContent = {
  destinos: [],
  experiencias: [],
  stays: [],
  food: [],
  eventos: [],
  rutas: [],
  mapPoints: [],
  mediaAssets: {},
};

function cardsFrom(
  result: SmartBlockResolveResult,
  category: (item: Record<string, SmartBlockJsonValue>) => string,
  businessIdOf?: (item: Record<string, SmartBlockJsonValue>) => string | null,
): HomeRealCard[] {
  const out: HomeRealCard[] = [];
  for (const item of result.items) {
    const title = typeof item.name === "string" ? item.name : "";
    const href = typeof item.href === "string" ? item.href : "";
    if (!title || !href.startsWith("/")) continue;
    const media =
      (typeof item.hero_image_url === "string" ? item.hero_image_url : null) ??
      (typeof item.cover_image_url === "string" ? item.cover_image_url : null) ??
      "";
    out.push({
      businessId: businessIdOf?.(item) ?? null,
      title,
      subtitle: typeof item.short_description === "string" ? item.short_description : "",
      category: category(item),
      href,
      mediaUrl: media,
      puebloMagico:
        typeof item.slug === "string" ? PUEBLOS_MAGICOS.has(item.slug.toLowerCase()) : false,
    });
  }
  return out;
}

/** Corpus real que alimenta la Home premium. Read-only, fail-closed. */
export async function resolveHomePremiumRealContentQuery(): Promise<HomeRealContent> {
  if (homeCache && Date.now() - homeCache.at < HOME_CACHE_TTL_MS) return homeCache.value;
  try {
    const settled = await Promise.allSettled([
      resolveSmartBlockQuery({
        select: ["slug", "name", "short_description", "hero_image_url", "href"],
        table: "destinations",
        limit: 8,
      }),
      resolveSmartBlockQuery({
        select: ["slug", "name", "short_description", "cover_image_url", "category_slug", "href"],
        table: "businesses",
        limit: 40,
      }),
      resolveSmartBlockQuery({
        select: ["slug", "name", "short_description", "cover_image_url", "href"],
        table: "products",
        limit: 6,
      }),
      resolveSmartBlockQuery({
        select: ["slug", "name", "short_description", "cover_image_url", "starts_at", "href"],
        table: "events",
        limit: 30,
      }),
      resolveTerritoryMapPointsQuery(),
      readPublishedRouteCards({ limit: 6 }),
      // Valladolid es la puerta territorial del Home. La consulta dedicada
      // garantiza su presencia aunque el orden general lo deje fuera del
      // primer lote de ocho destinos publicados.
      resolveSmartBlockQuery({
        select: ["slug", "name", "short_description", "hero_image_url", "href"],
        table: "destinations",
        filters: [{ column: "slug", op: "eq", value: "valladolid" }],
        limit: 1,
      }),
    ]);

    // Una fuente temporalmente indisponible no debe borrar las demás
    // secciones del Home. Cada familia degrada de forma independiente.
    const emptyResult: SmartBlockResolveResult = { items: [], count: 0, cached: false };
    const resultAt = (index: number): SmartBlockResolveResult => {
      const result = settled[index];
      return result?.status === "fulfilled"
        ? (result.value as SmartBlockResolveResult)
        : emptyResult;
    };
    const destRes = resultAt(0);
    const bizRes = resultAt(1);
    const prodRes = resultAt(2);
    const eventRes = resultAt(3);
    const mapResult = settled[4];
    const mapPoints =
      mapResult?.status === "fulfilled" ? (mapResult.value as HomeRealContent["mapPoints"]) : [];
    const routeResult = settled[5];
    const publishedRoutes = routeResult?.status === "fulfilled" ? routeResult.value : [];
    const valladolidRes = resultAt(6);

    const valladolidItem = valladolidRes.items[0];
    const destinationItems = valladolidItem
      ? [valladolidItem, ...destRes.items.filter((item) => item.slug !== "valladolid")].slice(0, 8)
      : destRes.items;
    const destinos = cardsFrom({ ...destRes, items: destinationItems }, () => "Destino");
    const businesses = cardsFrom(
      bizRes,
      (item) => (typeof item.category_slug === "string" ? item.category_slug : ""),
      (item) => (typeof item.id === "string" ? item.id : null),
    );
    const byCategory = (slug: string) => businesses.filter((b) => b.category === slug);
    const stays = byCategory("hoteles")
      .slice(0, 4)
      .map((b) => ({ ...b, category: "Hospedaje" }));
    const food = byCategory("restaurantes")
      .slice(0, 4)
      .map((b) => ({ ...b, category: "Gastronomía" }));
    const experiencias = [
      ...cardsFrom(
        prodRes,
        () => "Experiencia",
        (item) => (typeof item.business_id === "string" ? item.business_id : null),
      ),
      ...byCategory("experiencias").map((b) => ({ ...b, category: "Experiencias" })),
      ...byCategory("cenotes").map((b) => ({ ...b, category: "Cenotes" })),
    ].slice(0, 6);

    // La fecha acreditada del evento viaja hasta la portada para permitir
    // búsqueda por fecha. Sin `starts_at` publicado, la tarjeta conserva el
    // orden editorial y no declara fecha (jamás se inventa una).
    const eventStartsByHref = new Map<string, string>();
    const eventRecurrenceByHref = new Map<string, EventRecurrencePayload>();
    for (const item of eventRes.items) {
      if (typeof item.href !== "string") continue;
      if (typeof item.starts_at === "string") eventStartsByHref.set(item.href, item.starts_at);
      const recurrence = item.recurrence;
      if (recurrence && typeof recurrence === "object" && !Array.isArray(recurrence)) {
        eventRecurrenceByHref.set(item.href, recurrence as unknown as EventRecurrencePayload);
      }
    }
    const eventos = cardsFrom(eventRes, () => "Evento").map((card, index) => ({
      ...card,
      day: String(index + 1).padStart(2, "0"),
      startsAt: eventStartsByHref.get(card.href) ?? null,
      recurrence: eventRecurrenceByHref.get(card.href) ?? null,
    }));

    const stopPointsByRoute = await resolveRouteStopPoints(publishedRoutes.map((r) => r.id));
    const rutas = publishedRoutes.map((route) => ({
      id: route.id,
      title: route.name,
      duration: routeDurationLabel(route) ?? "",
      stops: route.stopCount,
      vibe: routePaceLabel(route.pace) ?? routeDifficultyLabel(route.difficulty) ?? "",
      description: route.summary,
      sequence: [
        ...(route.originDestinationLabel ? [route.originDestinationLabel] : []),
        ...route.destinationSlugs.map((slug) => slug.replaceAll("-", " ")),
      ],
      stopPoints: stopPointsByRoute.get(route.id) ?? [],
      href: routePublicPath(route.slug),
      mediaUrl: route.coverUrl ?? "",
    }));

    const mediaAssets = await resolveStableMediaAssets([
      ...destinos.map((c) => c.mediaUrl),
      ...experiencias.map((c) => c.mediaUrl),
      ...stays.map((c) => c.mediaUrl),
      ...food.map((c) => c.mediaUrl),
      ...eventos.map((c) => c.mediaUrl),
      ...rutas.map((r) => r.mediaUrl),
      ...HOME_PREMIUM_STABLE_MEDIA_URLS,
    ]);

    for (const route of publishedRoutes) {
      if (route.coverUrl && route.coverAsset) mediaAssets[route.coverUrl] = route.coverAsset;
    }

    const value: HomeRealContent = {
      destinos,
      experiencias,
      stays,
      food,
      eventos,
      rutas,
      mapPoints,
      mediaAssets,
    };
    homeCache = { at: Date.now(), value };
    return value;
  } catch {
    return EMPTY_HOME;
  }
}
