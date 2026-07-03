/**
 * Experience Builder · Smart Blocks Resolver (Etapa 15.10.8.2)
 *
 * Resolver server-side declarativo para Smart Blocks. Ejecuta la
 * `SmartBlockQuery` declarada en el Block Contract usando el cliente
 * publishable de Supabase (RLS anon), con lista blanca estricta de tablas,
 * columnas seguras, operadores permitidos y caché en memoria por proceso.
 *
 * Falla cerrada: cualquier error devuelve `{ items: [], error }` para
 * no romper el render público.
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  SmartBlockFilter,
  SmartBlockOrderBy,
  SmartBlockQuery,
} from "./block-contract";

export interface SmartBlockResolveResult {
  items: Array<Record<string, unknown>>;
  count: number;
  cached: boolean;
  error?: string;
}

/** Lista blanca de tablas expuestas al resolver público. */
const ALLOWED_TABLES: Record<SmartBlockQuery["table"], ReadonlyArray<string>> = {
  destinations: [
    "id", "slug", "name", "short_description", "hero_image_url",
    "state_id", "region_id", "country_id", "status", "is_featured", "sort_order",
  ],
  destination_zones: [
    "id", "slug", "name", "short_description", "hero_image_url",
    "destination_id", "status", "sort_order",
  ],
  businesses: [
    "id", "slug", "name", "short_description", "logo_url", "cover_image_url",
    "destination_id", "zone_id", "status", "is_featured", "rating_avg",
  ],
  products: [
    "id", "slug", "name", "short_description", "cover_image_url",
    "business_id", "destination_id", "price", "currency", "status", "is_featured",
  ],
  events: [
    "id", "slug", "name", "short_description", "cover_image_url",
    "destination_id", "starts_at", "ends_at", "status", "is_featured",
  ],
  promotions: [
    "id", "slug", "name", "short_description", "cover_image_url",
    "business_id", "destination_id", "starts_at", "ends_at", "status",
  ],
  articles: [
    "id", "slug", "title", "excerpt", "cover_image_url",
    "destination_id", "published_at", "status", "is_featured",
  ],
};

const ALLOWED_OPS = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte", "in", "contains", "ilike",
]);

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 12;
const CACHE_TTL_MS = 60_000;

type CacheEntry = { at: number; value: SmartBlockResolveResult };
const cache = new Map<string, CacheEntry>();

function cacheKey(q: SmartBlockQuery): string {
  return JSON.stringify(q);
}

function getPublicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public client env missing");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeSelect(table: SmartBlockQuery["table"], select: string[]): string[] {
  const allowed = ALLOWED_TABLES[table];
  const safe = select.filter((c) => allowed.includes(c));
  if (safe.length === 0) throw new Error(`no allowed columns for table "${table}"`);
  return safe;
}

function assertColumn(table: SmartBlockQuery["table"], column: string) {
  if (!ALLOWED_TABLES[table].includes(column)) {
    throw new Error(`column "${column}" not allowed for table "${table}"`);
  }
}

function applyFilter(builder: any, table: SmartBlockQuery["table"], f: SmartBlockFilter): any {
  if (!ALLOWED_OPS.has(f.op)) throw new Error(`operator "${f.op}" not allowed`);
  assertColumn(table, f.column);
  switch (f.op) {
    case "in":
      if (!Array.isArray(f.value)) throw new Error(`"in" requires array value`);
      return builder.in(f.column, f.value);
    case "contains":
      return builder.contains(f.column, f.value as never);
    case "ilike":
      return builder.ilike(f.column, String(f.value));
    default:
      return (builder as any)[f.op](f.column, f.value);
  }
}

function applyOrder(builder: any, table: SmartBlockQuery["table"], o: SmartBlockOrderBy): any {
  assertColumn(table, o.column);
  return builder.order(o.column, { ascending: (o.direction ?? "asc") === "asc" });
}

/**
 * Resuelve una `SmartBlockQuery` declarativa. Read-only, RLS anon.
 */
export const resolveSmartBlock = createServerFn({ method: "POST" })
  .inputValidator((data: { query: SmartBlockQuery }) => data)
  .handler(async ({ data }): Promise<SmartBlockResolveResult> => {
    const q = data.query;
    try {
      if (!q || !q.table || !ALLOWED_TABLES[q.table]) {
        return { items: [], count: 0, cached: false, error: "table not allowed" };
      }
      const key = cacheKey(q);
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return { ...hit.value, cached: true };
      }

      const select = sanitizeSelect(q.table, q.select);
      const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? DEFAULT_LIMIT));

      const client = getPublicClient();
      let builder: any = client.from(q.table).select(select.join(","));
      for (const f of q.filters ?? []) builder = applyFilter(builder, q.table, f);
      for (const o of q.order_by ?? []) builder = applyOrder(builder, q.table, o);
      builder = builder.limit(limit);

      const { data: rows, error } = await builder;
      if (error) {
        return { items: [], count: 0, cached: false, error: error.message };
      }
      const value: SmartBlockResolveResult = {
        items: (rows ?? []) as Array<Record<string, unknown>>,
        count: rows?.length ?? 0,
        cached: false,
      };
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
  });