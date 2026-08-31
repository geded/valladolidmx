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
import { toStablePublicMediaUrl } from "@/lib/media/stable-public-url";

export type SmartBlockJsonValue =
  string | number | boolean | null | SmartBlockJsonValue[] | { [k: string]: SmartBlockJsonValue };

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
      if (stableUrl) out.set(id, stableUrl);
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
}

export interface HomeRealContent {
  destinos: HomeRealCard[];
  experiencias: HomeRealCard[];
  stays: HomeRealCard[];
  food: HomeRealCard[];
  eventos: Array<HomeRealCard & { day: string }>;
  rutas: HomeRealRoute[];
  mapPoints: TerritoryMapPoint[];
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
};

function cardsFrom(
  result: SmartBlockResolveResult,
  category: (item: Record<string, SmartBlockJsonValue>) => string,
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

/** Construye rutas sobre destinos reales publicados; sin tiempos inventados. */
function routesFrom(destinos: HomeRealCard[]): HomeRealRoute[] {
  if (destinos.length < 2) return [];
  const magicos = destinos.filter((d) => d.puebloMagico).map((d) => d.title);
  const routes: HomeRealRoute[] = [];
  if (magicos.length >= 2) {
    routes.push({
      id: "pueblos-magicos",
      title: "Pueblos Mágicos del Oriente Maya",
      duration: `${magicos.length} destinos`,
      stops: magicos.length,
      vibe: "Patrimonio y cultura viva",
      description:
        "Recorre los Pueblos Mágicos publicados del oriente de Yucatán en un orden comprensible, iniciando por la capital turística.",
      sequence: magicos,
    });
  }
  const territorio = destinos.slice(0, 4).map((d) => d.title);
  if (territorio.length >= 2) {
    routes.push({
      id: "territorio-completo",
      title: "Panorámica del territorio",
      duration: `${territorio.length} destinos`,
      stops: territorio.length,
      vibe: "Primera aproximación",
      description:
        "Una secuencia amplia sobre los destinos publicados para reconocer el territorio antes de profundizar.",
      sequence: territorio,
    });
  }
  return routes;
}

/** Corpus real que alimenta la Home premium. Read-only, fail-closed. */
export async function resolveHomePremiumRealContentQuery(): Promise<HomeRealContent> {
  if (homeCache && Date.now() - homeCache.at < HOME_CACHE_TTL_MS) return homeCache.value;
  try {
    const [destRes, bizRes, prodRes, eventRes, mapPoints] = await Promise.all([
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
        limit: 6,
      }),
      resolveTerritoryMapPointsQuery(),
    ]);

    const destinos = cardsFrom(destRes, () => "Destino");
    const businesses = cardsFrom(bizRes, (item) =>
      typeof item.category_slug === "string" ? item.category_slug : "",
    );
    const byCategory = (slug: string) => businesses.filter((b) => b.category === slug);
    const stays = byCategory("hoteles")
      .slice(0, 4)
      .map((b) => ({ ...b, category: "Hospedaje" }));
    const food = byCategory("restaurantes")
      .slice(0, 4)
      .map((b) => ({ ...b, category: "Gastronomía" }));
    const experiencias = [
      ...cardsFrom(prodRes, () => "Experiencia"),
      ...byCategory("experiencias").map((b) => ({ ...b, category: "Experiencias" })),
      ...byCategory("cenotes").map((b) => ({ ...b, category: "Cenotes" })),
    ].slice(0, 6);

    const eventos = cardsFrom(eventRes, () => "Evento").map((card, index) => ({
      ...card,
      day: String(index + 1).padStart(2, "0"),
    }));

    const value: HomeRealContent = {
      destinos,
      experiencias,
      stays,
      food,
      eventos,
      rutas: routesFrom(destinos),
      mapPoints,
    };
    homeCache = { at: Date.now(), value };
    return value;
  } catch {
    return EMPTY_HOME;
  }
}
