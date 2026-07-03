/**
 * Sprint Reconciliación 4 · Eventos v1 — Public reads.
 *
 * Lecturas públicas (anon + RLS `events_public_read`) para
 * `/eventos`, `/eventos/{slug}` y para alimentar la sección
 * "Próximos eventos" de la ficha de destino.
 *
 * Sin backend nuevo: reutiliza el patrón del publishable client
 * (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`) ya usado por
 * `destinations/public-reads.functions.ts`. Proyecta sólo columnas
 * seguras del esquema vigente de `events` (sin nuevas columnas).
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublicEventCard {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  is_free: boolean;
  destination_slug: string | null;
  cover_url: string | null;
}

export interface PublicEventDetail extends PublicEventCard {
  body: string | null;
  external_url: string | null;
  destination_name: string | null;
  business_id: string | null;
  destination_id: string | null;
  published_at: string | null;
  updated_at: string | null;
}

function pubClient() {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

async function signMedia(
  bucket: string | null | undefined,
  path: string | null | undefined,
): Promise<string | null> {
  if (!bucket || !path) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

function isSlug(s: unknown): s is string {
  return typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s);
}

const SELECT_CARD =
  "id, slug, title, summary, starts_at, ends_at, venue_name, is_free, destination_id, cover_media_id, destinations:destination_id ( slug ), media_assets:cover_media_id ( storage_bucket, storage_path )";

type CardRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  is_free: boolean;
  destination_id: string | null;
  cover_media_id: string | null;
  destinations?: { slug?: string | null } | null;
  media_assets?: { storage_bucket?: string | null; storage_path?: string | null } | null;
};

async function mapCards(rows: CardRow[], withCover: boolean): Promise<PublicEventCard[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? null,
      starts_at: r.starts_at,
      ends_at: r.ends_at ?? null,
      venue_name: r.venue_name ?? null,
      is_free: Boolean(r.is_free),
      destination_slug: r.destinations?.slug ?? null,
      cover_url: withCover
        ? await signMedia(r.media_assets?.storage_bucket, r.media_assets?.storage_path)
        : null,
    })),
  );
}

export const listPublishedEvents = createServerFn({ method: "GET" })
  .inputValidator((input?: { destinationSlug?: string; limit?: number; upcomingOnly?: boolean }) => {
    const i = input ?? {};
    if (i.destinationSlug !== undefined && !isSlug(i.destinationSlug)) {
      throw new Error("Invalid destinationSlug");
    }
    const limit = typeof i.limit === "number" && i.limit > 0 ? Math.min(i.limit, 100) : 60;
    return {
      destinationSlug: i.destinationSlug,
      limit,
      upcomingOnly: i.upcomingOnly !== false,
    };
  })
  .handler(async ({ data }): Promise<PublicEventCard[]> => {
    const sb = await pubClient();
    let destinationId: string | null = null;
    if (data.destinationSlug) {
      const { data: d } = await sb
        .from("destinations")
        .select("id")
        .eq("slug", data.destinationSlug)
        .maybeSingle();
      if (!d) return [];
      destinationId = (d as { id: string }).id;
    }
    let q = sb
      .from("events")
      .select(SELECT_CARD)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("starts_at", { ascending: true })
      .limit(data.limit);
    if (data.upcomingOnly) q = q.gte("starts_at", new Date().toISOString());
    if (destinationId) q = q.eq("destination_id", destinationId);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[listPublishedEvents]", error);
      return [];
    }
    return mapCards((rows ?? []) as unknown as CardRow[], false);
  });

export const listEventsForDestination = createServerFn({ method: "GET" })
  .inputValidator((input: { destinationId: string; limit?: number }) => {
    if (!input || typeof input.destinationId !== "string") throw new Error("Invalid destinationId");
    const limit = typeof input.limit === "number" && input.limit > 0 ? Math.min(input.limit, 24) : 6;
    return { destinationId: input.destinationId, limit };
  })
  .handler(async ({ data }): Promise<PublicEventCard[]> => {
    const sb = await pubClient();
    const { data: rows, error } = await sb
      .from("events")
      .select(SELECT_CARD)
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("destination_id", data.destinationId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(data.limit);
    if (error) {
      console.error("[listEventsForDestination]", error);
      return [];
    }
    return mapCards((rows ?? []) as unknown as CardRow[], false);
  });

export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || !isSlug(input.slug)) throw new Error("Invalid slug");
    return input;
  })
  .handler(async ({ data }): Promise<PublicEventDetail | null> => {
    const sb = await pubClient();
    const { data: row, error } = await sb
      .from("events")
      .select(
        "id, slug, title, summary, body, starts_at, ends_at, venue_name, is_free, external_url, destination_id, business_id, cover_media_id, published_at, updated_at, destinations:destination_id ( slug, name ), media_assets:cover_media_id ( storage_bucket, storage_path )",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[getEventBySlug]", error);
      return null;
    }
    if (!row) return null;
    const r = row as unknown as CardRow & {
      body: string | null;
      external_url: string | null;
      business_id: string | null;
      published_at: string | null;
      updated_at: string | null;
      destinations?: { slug?: string | null; name?: string | null } | null;
    };
    const cover = await signMedia(r.media_assets?.storage_bucket, r.media_assets?.storage_path);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? null,
      body: r.body ?? null,
      starts_at: r.starts_at,
      ends_at: r.ends_at ?? null,
      venue_name: r.venue_name ?? null,
      is_free: Boolean(r.is_free),
      external_url: r.external_url ?? null,
      destination_id: r.destination_id ?? null,
      destination_slug: r.destinations?.slug ?? null,
      destination_name: r.destinations?.name ?? null,
      business_id: r.business_id ?? null,
      cover_url: cover,
      published_at: r.published_at ?? null,
      updated_at: r.updated_at ?? null,
    };
  });