/**
 * Lote 3C · Lecturas públicas de Rutas / Itinerarios editoriales.
 *
 * Cliente publishable (RLS aplica como anon). Sólo rutas publicadas.
 * Las paradas resuelven su enlace canónico contra las entidades reales
 * publicadas; si la entidad no está publicada, la parada conserva su
 * título editorial sin enlace (nunca se inventa destino).
 */
import { createClient } from "@supabase/supabase-js";
import type { MediaAssetInput } from "@/lib/media/resolve-source";
import { attachReadyVariants, shouldServePublicVariants, type AssetBaseForVariants } from "@/lib/media/variant-bundles.server";
type RouteMedia = { url: string | null; alt: string | null; asset?: MediaAssetInput };
import type {
  EditorialRouteCardDTO,
  EditorialRouteDetailDTO,
  EditorialRoutePalette,
  EditorialRouteStopDTO,
  EditorialRouteStopKind,
} from "./route-public-contract";

const PALETTES = new Set<EditorialRoutePalette>(["territorio", "selva", "cenote", "atardecer"]);

interface EditorialRouteRow {
  id: string;
  slug: string;
  name: string;
  summary?: string | null;
  body?: string | null;
  palette?: EditorialRoutePalette | null;
  region_slug?: string | null;
  duration_days?: number | null;
  duration_hours?: number | null;
  pace?: string | null;
  difficulty?: string | null;
  interests?: string[] | null;
  audiences?: string[] | null;
  seasons?: string[] | null;
  destination_ids?: string[] | null;
  origin_destination_id?: string | null;
  cover_media_id?: string | null;
  gallery_media_ids?: string[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function anonClient(): AnyClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ROUTE_COLUMNS =
  "id, slug, name, summary, body, palette, duration_days, duration_hours, pace, difficulty, interests, audiences, seasons, destination_ids, origin_destination_id, region_slug, cover_media_id, gallery_media_ids, status, deleted_at, published_at";

async function destinationSlugMap(
  sb: AnyClient,
  ids: string[],
): Promise<Map<string, { slug: string; name: string }>> {
  const map = new Map<string, { slug: string; name: string }>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return map;
  const { data } = await sb
    .from("destinations")
    .select("id, slug, name, status, deleted_at")
    .in("id", unique)
    .eq("status", "published")
    .is("deleted_at", null);
  for (const d of (data ?? []) as Array<{ id: string; slug: string; name: string }>)
    map.set(d.id, { slug: d.slug, name: d.name });
  return map;
}

async function signMedia(
  ids: string[],
): Promise<Map<string, RouteMedia>> {
  const out = new Map<string, RouteMedia>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return out;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("media_assets")
    .select(
      "id, storage_bucket, storage_path, width, height, pipeline_status, alt_text, alt_text_ai, alt_text_source, review_state",
    )
    .in("id", unique);
  const { resolveMediaAlt } = await import("@/lib/media/resolve-alt");
  const bases: AssetBaseForVariants[] = [];
  for (const asset of (data ?? []) as Array<Record<string, unknown>>) {
    let url: string | null = null;
    if (asset.storage_bucket && asset.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from(String(asset.storage_bucket))
        .createSignedUrl(String(asset.storage_path), 60 * 60);
      url = signed?.signedUrl ?? null;
    }
    if (url) bases.push({ id: String(asset.id), file_url: url, width: typeof asset.width === "number" ? asset.width : null, height: typeof asset.height === "number" ? asset.height : null, pipeline_status: typeof asset.pipeline_status === "string" ? asset.pipeline_status : null });
    out.set(String(asset.id), {
      url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alt: resolveMediaAlt(asset as any, { fallback: "" }) || null,
    });
  }
  if (await shouldServePublicVariants()) {
    const bundles = await attachReadyVariants(bases);
    for (const [id, media] of out) if (bundles[id]) media.asset = bundles[id];
  }
  return out;
}

function toCard(
  row: EditorialRouteRow,
  destinations: Map<string, { slug: string; name: string }>,
  cover: RouteMedia | undefined,
  stopCount: number,
): EditorialRouteCardDTO {
  const origin = row.origin_destination_id
    ? (destinations.get(row.origin_destination_id) ?? null)
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: (row.summary ?? "").trim(),
    palette: row.palette && PALETTES.has(row.palette) ? row.palette : "territorio",
    regionSlug: row.region_slug ?? "oriente-maya",
    durationDays: row.duration_days ?? null,
    durationHours: row.duration_hours ?? null,
    pace: row.pace ?? null,
    difficulty: row.difficulty ?? null,
    interests: (row.interests ?? []) as string[],
    audiences: (row.audiences ?? []) as string[],
    seasons: (row.seasons ?? []) as string[],
    destinationSlugs: ((row.destination_ids ?? []) as string[])
      .map((id) => destinations.get(id)?.slug)
      .filter((s): s is string => Boolean(s)),
    originDestinationSlug: origin?.slug ?? null,
    originDestinationLabel: origin?.name ?? null,
    coverUrl: cover?.url ?? null,
    coverAlt: cover?.alt ?? null,
    coverAsset: cover?.asset,
    stopCount,
  };
}

export async function readPublishedRouteCards(input?: {
  destinationSlug?: string | null;
  limit?: number;
}): Promise<EditorialRouteCardDTO[]> {
  const sb = anonClient();
  const { data, error } = await sb
    .from("editorial_routes")
    .select(ROUTE_COLUMNS)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: true })
    .limit(input?.limit ?? 48);
  if (error) return [];
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (!rows.length) return [];

  const destinationIds = rows.flatMap((r) => [
    ...((r.destination_ids ?? []) as string[]),
    ...(r.origin_destination_id ? [String(r.origin_destination_id)] : []),
  ]);
  const [destinations, media, counts] = await Promise.all([
    destinationSlugMap(sb, destinationIds),
    signMedia(rows.map((r) => String(r.cover_media_id ?? "")).filter(Boolean)),
    sb
      .from("editorial_route_stops")
      .select("route_id")
      .in(
        "route_id",
        rows.map((r) => r.id),
      )
      .then(({ data: stops }: { data: Array<{ route_id: string }> | null }) => {
        const map = new Map<string, number>();
        for (const s of stops ?? []) map.set(s.route_id, (map.get(s.route_id) ?? 0) + 1);
        return map;
      }),
  ]);

  const cards = rows.map((row) =>
    toCard(
      row as unknown as EditorialRouteRow,
      destinations,
      row.cover_media_id ? media.get(String(row.cover_media_id)) : undefined,
      counts.get(String(row.id)) ?? 0,
    ),
  );
  const destino = input?.destinationSlug?.trim() || null;
  return destino
    ? cards.filter(
        (c) => c.destinationSlugs.includes(destino) || c.originDestinationSlug === destino,
      )
    : cards;
}

/**
 * Resuelve, por entidad de parada, su enlace canónico y sus coordenadas
 * acreditadas. Si la entidad no publicó ubicación, la parada se queda sin
 * coordenadas: el mapa simplemente no la dibuja (nunca se inventa un punto).
 */
async function resolveStopEntities(
  sb: AnyClient,
  stops: Array<{ entity_kind: string; entity_id: string | null }>,
): Promise<{
  hrefs: Map<string, string>;
  coords: Map<string, { lat: number; lng: number }>;
}> {
  const hrefs = new Map<string, string>();
  const coords = new Map<string, { lat: number; lng: number }>();
  const setCoord = (id: string, lat: unknown, lng: unknown) => {
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) coords.set(id, { lat: la, lng: ln });
  };
  const idsOf = (kind: string) =>
    Array.from(
      new Set(
        stops.filter((s) => s.entity_kind === kind && s.entity_id).map((s) => String(s.entity_id)),
      ),
    );

  const destinationIds = idsOf("destination");
  const placeIds = idsOf("place");
  const eventIds = idsOf("event");
  const businessIds = idsOf("business");

  const [dests, places, events, businesses] = await Promise.all([
    destinationIds.length
      ? sb
          .from("destinations")
          .select("id, slug, latitude, longitude, status, deleted_at")
          .in("id", destinationIds)
          .eq("status", "published")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    placeIds.length
      ? sb
          .from("points_of_interest")
          .select("id, slug, destination_id, latitude, longitude, status, deleted_at")
          .in("id", placeIds)
          .eq("status", "published")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? sb
          .from("events")
          .select("id, slug, status, deleted_at")
          .in("id", eventIds)
          .eq("status", "published")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    businessIds.length
      ? sb
          .from("businesses")
          .select(
            "id, slug, destination_id, primary_category_id, business_locations ( latitude, longitude ), status, deleted_at",
          )
          .in("id", businessIds)
          .eq("status", "published")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const destRows = (dests.data ?? []) as Array<{
    id: string;
    slug: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  for (const d of destRows) {
    hrefs.set(d.id, `/oriente-maya/${d.slug}`);
    setCoord(d.id, d.latitude, d.longitude);
  }

  const placeRows = (places.data ?? []) as Array<{
    id: string;
    slug: string;
    destination_id: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  const businessRows = (businesses.data ?? []) as Array<{
    id: string;
    slug: string;
    destination_id: string | null;
    primary_category_id: string | null;
    business_locations?:
      | Array<{ latitude?: number | null; longitude?: number | null }>
      | { latitude?: number | null; longitude?: number | null }
      | null;
  }>;

  const extraDestIds = [
    ...placeRows.map((p) => p.destination_id),
    ...businessRows.map((b) => b.destination_id),
  ].filter((v): v is string => Boolean(v));
  const destMap = await destinationSlugMap(sb, [...extraDestIds]);

  for (const p of placeRows) {
    const d = p.destination_id ? destMap.get(p.destination_id) : null;
    if (d) hrefs.set(p.id, `/oriente-maya/${d.slug}/lugares/${p.slug}`);
    setCoord(p.id, p.latitude, p.longitude);
  }

  for (const e of (events.data ?? []) as Array<{ id: string; slug: string }>)
    hrefs.set(e.id, `/eventos/${e.slug}`);

  const categoryIds = businessRows
    .map((b) => b.primary_category_id)
    .filter((v): v is string => Boolean(v));
  const catMap = new Map<string, string>();
  if (categoryIds.length) {
    const { data: cats } = await sb
      .from("business_categories")
      .select("id, slug")
      .in("id", Array.from(new Set(categoryIds)));
    for (const c of (cats ?? []) as Array<{ id: string; slug: string }>)
      catMap.set(c.id, c.slug.toLowerCase());
  }
  for (const b of businessRows) {
    const d = b.destination_id ? destMap.get(b.destination_id) : null;
    const cat = b.primary_category_id ? catMap.get(b.primary_category_id) : null;
    if (d && cat) hrefs.set(b.id, `/oriente-maya/${d.slug}/${cat}/${b.slug}`);
    const loc = Array.isArray(b.business_locations)
      ? (b.business_locations[0] ?? null)
      : (b.business_locations ?? null);
    if (loc) setCoord(b.id, loc.latitude, loc.longitude);
  }

  return { hrefs, coords };
}

export async function readPublicRoute(slug: string): Promise<EditorialRouteDetailDTO | null> {
  const sb = anonClient();
  const { data, error } = await sb
    .from("editorial_routes")
    .select(ROUTE_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;

  const { data: stopRows } = await sb
    .from("editorial_route_stops")
    .select("id, position, day_number, entity_kind, entity_id, title, note, duration_minutes")
    .eq("route_id", row.id)
    .order("position", { ascending: true });

  const stopsRaw = (stopRows ?? []) as Array<Record<string, unknown>>;
  const galleryIds = (row.gallery_media_ids ?? []) as string[];

  const [destinations, media, entities] = await Promise.all([
    destinationSlugMap(sb, [
      ...((row.destination_ids ?? []) as string[]),
      ...(row.origin_destination_id ? [String(row.origin_destination_id)] : []),
    ]),
    signMedia([...(row.cover_media_id ? [String(row.cover_media_id)] : []), ...galleryIds]),
    resolveStopEntities(
      sb,
      stopsRaw.map((s) => ({
        entity_kind: String(s.entity_kind),
        entity_id: s.entity_id ? String(s.entity_id) : null,
      })),
    ),
  ]);

  const stops: EditorialRouteStopDTO[] = stopsRaw.map((s) => {
    const entityId = s.entity_id ? String(s.entity_id) : null;
    const point = entityId ? (entities.coords.get(entityId) ?? null) : null;
    return {
      id: String(s.id),
      position: Number(s.position ?? 0),
      dayNumber: s.day_number == null ? null : Number(s.day_number),
      entityKind: String(s.entity_kind) as EditorialRouteStopKind,
      entityId,
      title: String(s.title ?? ""),
      note: ((s.note as string) ?? "").trim() || null,
      durationMinutes: s.duration_minutes == null ? null : Number(s.duration_minutes),
      href: entityId ? (entities.hrefs.get(entityId) ?? null) : null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    };
  });

  const roadPoints = stops
    .filter(
      (stop) =>
        typeof stop.lat === "number" &&
        Number.isFinite(stop.lat) &&
        typeof stop.lng === "number" &&
        Number.isFinite(stop.lng),
    )
    .map((stop) => ({ lat: stop.lat as number, lng: stop.lng as number }));
  const roadResult =
    roadPoints.length > 1
      ? await import("@/lib/maps/routes.server").then(({ computeRoadRouteInternal }) =>
          computeRoadRouteInternal(roadPoints),
        )
      : null;

  const card = toCard(
    row as unknown as EditorialRouteRow,
    destinations,
    row.cover_media_id ? media.get(String(row.cover_media_id)) : undefined,
    stops.length,
  );

  return {
    ...card,
    contractVersion: "1.0.0",
    body: String((row as { body?: string | null }).body ?? "").trim() || null,
    stops,
    roadRoute:
      roadResult?.ok && roadResult.encodedPolyline
        ? {
            encodedPolyline: roadResult.encodedPolyline,
            distanceMeters: roadResult.distanceMeters,
            durationSeconds: roadResult.durationSeconds,
          }
        : null,
    gallery: galleryIds
      .map((id) => media.get(id))
      .filter((m): m is RouteMedia => Boolean(m?.url))
      .map((m) => ({ url: m.url as string, alt: m.alt, asset: m.asset })),
  };
}
