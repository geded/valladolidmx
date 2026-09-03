/**
 * G8-Q2D-B · Lectura productiva canónica de un Lugar por
 * `destinationSlug + placeSlug`.
 *
 * Servidor únicamente. Fail-closed:
 *  - el destino debe existir y coincidir con el del lugar;
 *  - la zona sólo se expone si pertenece a ESE destino;
 *  - el modo público exige `status = 'published'`;
 *  - nunca se completa un campo ausente con datos de otro lugar.
 */
import type {
  PublicPlaceCard,
  PublicPlaceDTO,
  PublicPlaceMediaDTO,
} from "./place-public-contract";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { resolvePlaceAttractionFamily } from "./place-taxonomy";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REGION_LABEL = "Oriente Maya";

const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v.trim()) : [];

const accessibilityList = (value: unknown): string[] => {
  if (Array.isArray(value)) return strArray(value);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === "string" && v.trim().length > 0))
      .map(([k, v]) => (typeof v === "string" ? `${k}: ${v}` : k));
  }
  return [];
};

function presentationFromMetadata(metadata: unknown): PremiumPresentation | null {
  const value = (metadata as Record<string, unknown> | null)?.presentation_mode;
  return value === "cinematic" || value === "editorial" ? value : null;
}

async function anonClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Firma las URLs de los activos del propio lugar. Nunca hereda medios de
 * destinos, empresas, productos ni de otros lugares.
 */
async function signPlaceMedia(sb: any, placeId: string): Promise<PublicPlaceMediaDTO[]> {
  const { data: links } = await sb
    .from("place_media")
    .select("media_asset_id, role, sort_order")
    .eq("place_id", placeId)
    .order("sort_order");
  const rows = (links ?? []) as Array<{
    media_asset_id: string;
    role: string;
    sort_order: number;
  }>;
  if (rows.length === 0) return [];

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: assets } = await supabaseAdmin
    .from("media_assets")
    .select(
      "id, storage_bucket, storage_path, alt_text, alt_text_ai, alt_text_source, review_state, caption, credit, metadata",
    )
    .in(
      "id",
      rows.map((r) => r.media_asset_id),
    );
  const byId = new Map<string, any>((assets ?? []).map((a: any) => [a.id, a]));
  const { resolveMediaAlt } = await import("@/lib/media/resolve-alt");

  const out: PublicPlaceMediaDTO[] = [];
  for (const link of rows) {
    const asset = byId.get(link.media_asset_id);
    if (!asset) continue;
    let url: string | null = null;
    if (asset.storage_bucket && asset.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      url = signed?.signedUrl ?? null;
    }
    const meta = (asset.metadata ?? {}) as Record<string, unknown>;
    const focal = (meta.focal ?? null) as { x: number; y: number } | null;
    out.push({
      mediaAssetId: asset.id,
      url,
      alt: resolveMediaAlt(asset, { fallback: "" }) || null,
      credit: (asset.credit ?? "").trim() || null,
      caption: (asset.caption ?? "").trim() || null,
      role: link.role,
      sortOrder: link.sort_order,
      approved: asset.review_state === "approved",
      aiGenerated: meta.ai_generated === true,
      focal,
    });
  }
  return out;
}

export interface ReadPlaceInput {
  destinationSlug: string;
  placeSlug: string;
  /** `true` sólo en la preview administrativa autenticada. */
  allowUnpublished?: boolean;
  /** Cliente Supabase del usuario autenticado (preview). */
  client?: any;
}

export async function readPublicPlace(input: ReadPlaceInput): Promise<PublicPlaceDTO | null> {
  const sb = input.client ?? (await anonClient());

  const { data: destination } = await sb
    .from("destinations")
    .select("id, slug, name")
    .eq("slug", input.destinationSlug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!destination) return null;

  const { data: place } = await sb
    .from("points_of_interest")
    .select(
      "id, slug, name, official_name, status, description, short_description, highlights, " +
        "place_type_id, destination_id, destination_zone_id, latitude, longitude, address_line, " +
        "directions, admission_kind, entry_fee_notes, price_from, price_to, price_currency, " +
        "visit_duration_minutes, best_time_to_visit, accessibility, amenities, contact_phone, " +
        "contact_whatsapp, contact_email, contact_website, social_links, metadata, attraction_family",
    )
    .eq("slug", input.placeSlug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!place) return null;

  // Fail-closed territorial: el lugar debe pertenecer al destino de la URL.
  if (place.destination_id !== destination.id) return null;
  if (!input.allowUnpublished && place.status !== "published") return null;

  let zone: { id: string; name: string } | null = null;
  if (place.destination_zone_id) {
    const { data: zoneRow } = await sb
      .from("destination_zones")
      .select("id, name, destination_id")
      .eq("id", place.destination_zone_id)
      .is("deleted_at", null)
      .maybeSingle();
    // La zona sólo se muestra si pertenece al mismo destino.
    if (zoneRow && zoneRow.destination_id === destination.id)
      zone = { id: zoneRow.id, name: zoneRow.name };
  }

  const [typeRes, catRes, hoursRes, authRes, prodRes, evtRes, seoRes] = await Promise.all([
    place.place_type_id
      ? sb
          .from("place_types")
          .select("slug, name, attraction_family")
          .eq("id", place.place_type_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from("place_category_links").select("category_id").eq("place_id", place.id),
    sb
      .from("place_hours")
      .select("day_of_week, opens_at, closes_at, is_closed, notes")
      .eq("place_id", place.id)
      .order("day_of_week"),
    sb
      .from("place_authorities")
      .select("authority_kind_id, business_id, authority_name, is_primary")
      .eq("place_id", place.id),
    sb
      .from("place_products")
      .select("product_id, relation_kind, sort_order")
      .eq("place_id", place.id)
      .order("sort_order"),
    sb
      .from("place_events")
      .select("event_id, relation_kind, sort_order")
      .eq("place_id", place.id)
      .order("sort_order"),
    sb
      .from("seo_metadata")
      .select("meta_title, meta_description")
      .eq("entity_kind", "point_of_interest")
      .eq("entity_id", place.id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const categoryIds = ((catRes.data ?? []) as Array<{ category_id: string }>).map(
    (r) => r.category_id,
  );
  let categories: Array<{ slug: string; name: string }> = [];
  if (categoryIds.length) {
    const { data } = await sb
      .from("place_categories")
      .select("slug, name")
      .in("id", categoryIds)
      .order("sort_order");
    categories = (data ?? []) as typeof categories;
  }

  const authorityRows = (authRes.data ?? []) as Array<{
    authority_kind_id: string;
    business_id: string | null;
    authority_name: string | null;
    is_primary: boolean;
  }>;
  let authorities: PublicPlaceDTO["authorities"] = [];
  if (authorityRows.length) {
    const { data: kinds } = await sb
      .from("place_authority_kinds")
      .select("id, name")
      .in(
        "id",
        authorityRows.map((r) => r.authority_kind_id),
      );
    const kindById = new Map<string, string>(
      ((kinds ?? []) as Array<{ id: string; name: string }>).map((k) => [k.id, k.name]),
    );
    const businessIds = authorityRows
      .map((r) => r.business_id)
      .filter((v): v is string => Boolean(v));
    const businessById = new Map<string, string>();
    if (businessIds.length) {
      const { data: businesses } = await sb
        .from("businesses")
        .select("id, name")
        .in("id", businessIds);
      for (const b of (businesses ?? []) as Array<{ id: string; name: string }>)
        businessById.set(b.id, b.name);
    }
    authorities = authorityRows
      .map((r) => ({
        kind: kindById.get(r.authority_kind_id) ?? "Autoridad",
        name: (r.business_id ? businessById.get(r.business_id) : null) ?? r.authority_name ?? "",
        isPrimary: r.is_primary,
      }))
      .filter((a) => a.name.length > 0);
  }

  const productRows = (prodRes.data ?? []) as Array<{
    product_id: string;
    relation_kind: string;
  }>;
  let products: PublicPlaceDTO["products"] = [];
  if (productRows.length) {
    const { data } = await sb
      .from("products")
      .select("id, name, short_description, status")
      .in(
        "id",
        productRows.map((r) => r.product_id),
      );
    const kindByProduct = new Map(productRows.map((r) => [r.product_id, r.relation_kind]));
    products = ((data ?? []) as Array<any>)
      .filter((p) => p.status === "published")
      .map((p) => ({
        id: p.id,
        title: p.name,
        eyebrow: kindByProduct.get(p.id) ?? "relacionado",
        description: p.short_description ?? "",
        media: null,
      }));
  }

  const eventRows = (evtRes.data ?? []) as Array<{ event_id: string; relation_kind: string }>;
  let events: PublicPlaceDTO["events"] = [];
  if (eventRows.length) {
    const { data } = await sb
      .from("events")
      .select("id, title, summary, status")
      .in(
        "id",
        eventRows.map((r) => r.event_id),
      );
    const kindByEvent = new Map(eventRows.map((r) => [r.event_id, r.relation_kind]));
    events = ((data ?? []) as Array<any>)
      .filter((e) => e.status === "published")
      .map((e) => ({
        id: e.id,
        title: e.title,
        eyebrow: kindByEvent.get(e.id) ?? "asociado",
        description: e.summary ?? "",
        media: null,
      }));
  }

  const media = await signPlaceMedia(sb, place.id);

  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    officialName: place.official_name ?? null,
    status: place.status,
    typeSlug: typeRes.data?.slug ?? null,
    typeLabel: typeRes.data?.name ?? null,
    /* Adenda documental: familia principal (override de ficha → tipo). */
    attractionFamily: resolvePlaceAttractionFamily(
      (place as any).attraction_family,
      typeRes.data?.attraction_family,
    ),
    destination: { slug: destination.slug, name: destination.name },
    zone,
    regionLabel: REGION_LABEL,
    description: place.description ?? null,
    shortDescription: place.short_description ?? null,
    highlights: strArray(place.highlights),
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    addressLine: place.address_line ?? null,
    directions: place.directions ?? null,
    hours: ((hoursRes.data ?? []) as Array<any>).map((h) => ({
      dayOfWeek: h.day_of_week,
      opensAt: h.opens_at ?? null,
      closesAt: h.closes_at ?? null,
      isClosed: Boolean(h.is_closed),
      notes: h.notes ?? null,
    })),
    admissionKind: place.admission_kind ?? null,
    entryFeeNotes: place.entry_fee_notes ?? null,
    priceFrom: place.price_from != null ? Number(place.price_from) : null,
    priceTo: place.price_to != null ? Number(place.price_to) : null,
    priceCurrency: place.price_currency ?? null,
    visitDurationMinutes: place.visit_duration_minutes ?? null,
    bestTimeToVisit: place.best_time_to_visit ?? null,
    accessibility: accessibilityList(place.accessibility),
    amenities: strArray(place.amenities),
    contact: {
      phone: place.contact_phone ?? null,
      whatsapp: place.contact_whatsapp ?? null,
      email: place.contact_email ?? null,
      website: place.contact_website ?? null,
    },
    socialLinks: (place.social_links ?? {}) as Record<string, string>,
    categories,
    media,
    authorities,
    products,
    events,
    presentationMode: presentationFromMetadata(place.metadata),
    seo: seoRes.data
      ? {
          title: seoRes.data.meta_title ?? null,
          description: seoRes.data.meta_description ?? null,
        }
      : null,
  };
}

/**
 * G8-Q2D-B · Preview administrativa: sólo staff editorial puede ver
 * borradores. Fail-closed ante cualquier error de verificación.
 */
export async function assertPlacePreviewStaff(client: any, userId: string): Promise<void> {
  const editorial = await client.rpc("is_editor_or_admin", { _user_id: userId });
  if (editorial.error) throw new Error(`role_check_failed: ${editorial.error.message}`);
  if (editorial.data === true) return;
  const granular = await client.rpc("has_permission", {
    _user_id: userId,
    _permission_key: "poi.write",
  });
  if (granular.error || granular.data !== true) throw new Error("forbidden");
}

/* ------------------------------------------------------------------ *
 * G4-PLACES · Lectura de tarjetas del listado territorial de Lugares.
 *
 * Sólo lecturas reales de `points_of_interest` + catálogos relacionados.
 * Fail-closed: únicamente `status='published'` y `deleted_at IS NULL`.
 * Los atributos de filtro se derivan EXCLUSIVAMENTE de columnas reales;
 * un campo sin captura simplemente no aparece.
 * ------------------------------------------------------------------ */

function durationFilterBucket(minutes: number): string {
  if (minutes <= 60) return "hasta-1-hora";
  if (minutes <= 120) return "1-2-horas";
  if (minutes <= 240) return "media-jornada";
  return "dia-completo";
}

export async function readPublishedPlaceCards(
  input: { destinationSlug?: string | null } = {},
): Promise<PublicPlaceCard[]> {
  const sb = await anonClient();

  let destinationId: string | null = null;
  if (input.destinationSlug) {
    const { data: destination } = await sb
      .from("destinations")
      .select("id")
      .eq("slug", input.destinationSlug)
      .is("deleted_at", null)
      .maybeSingle();
    if (!destination) return [];
    destinationId = destination.id as string;
  }

  let query = sb
    .from("points_of_interest")
    .select(
      "id, slug, name, short_description, place_type_id, destination_id, destination_zone_id, " +
        "latitude, longitude, admission_kind, price_from, price_to, price_currency, " +
        "visit_duration_minutes, best_time_to_visit, amenities, accessibility, attraction_family",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .order("name");
  if (destinationId) query = query.eq("destination_id", destinationId);
  const { data: rows } = await query;
  const places = (rows ?? []) as any[];
  if (places.length === 0) return [];

  const placeIds = places.map((p) => p.id as string);
  const uniq = (values: unknown[]) =>
    Array.from(new Set(values.filter((v): v is string => typeof v === "string" && !!v)));
  const destinationIds = uniq(places.map((p) => p.destination_id));
  const typeIds = uniq(places.map((p) => p.place_type_id));
  const zoneIds = uniq(places.map((p) => p.destination_zone_id));

  const [destRes, typeRes, zoneRes, linkRes, mediaRes] = await Promise.all([
    destinationIds.length
      ? sb.from("destinations").select("id, slug, name").in("id", destinationIds).is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    typeIds.length
      ? sb.from("place_types").select("id, slug, name, attraction_family").in("id", typeIds)
      : Promise.resolve({ data: [] }),
    zoneIds.length
      ? sb
          .from("destination_zones")
          .select("id, name, destination_id")
          .in("id", zoneIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    sb.from("place_category_links").select("place_id, category_id").in("place_id", placeIds),
    sb
      .from("place_media")
      .select("place_id, media_asset_id, role, sort_order")
      .in("place_id", placeIds)
      .order("sort_order"),
  ]);

  const destById = new Map<string, { slug: string; name: string }>(
    ((destRes.data ?? []) as any[]).map((d) => [d.id, { slug: d.slug, name: d.name }]),
  );
  const typeById = new Map<string, { slug: string; name: string; attraction_family?: string }>(
    ((typeRes.data ?? []) as any[]).map((t) => [
      t.id,
      { slug: t.slug, name: t.name, attraction_family: t.attraction_family },
    ]),
  );
  const zoneById = new Map<string, { name: string; destination_id: string }>(
    ((zoneRes.data ?? []) as any[]).map((z) => [
      z.id,
      { name: z.name, destination_id: z.destination_id },
    ]),
  );

  const links = (linkRes.data ?? []) as Array<{ place_id: string; category_id: string }>;
  const categoryIds = uniq(links.map((l) => l.category_id));
  const catById = new Map<string, { slug: string; name: string }>();
  if (categoryIds.length) {
    const { data: cats } = await sb
      .from("place_categories")
      .select("id, slug, name")
      .in("id", categoryIds);
    for (const c of (cats ?? []) as any[]) catById.set(c.id, { slug: c.slug, name: c.name });
  }
  const categoriesByPlace = new Map<string, Array<{ slug: string; name: string }>>();
  for (const link of links) {
    const cat = catById.get(link.category_id);
    if (!cat) continue;
    const list = categoriesByPlace.get(link.place_id) ?? [];
    list.push(cat);
    categoriesByPlace.set(link.place_id, list);
  }

  /* Portada gobernada del propio lugar: sólo activos aprobados y no IA.
     Nunca se hereda un medio de otro lugar/destino (política de medios). */
  const mediaLinks = (mediaRes.data ?? []) as Array<{
    place_id: string;
    media_asset_id: string;
    role: string;
    sort_order: number;
  }>;
  const assetIds = uniq(mediaLinks.map((l) => l.media_asset_id));
  const assetById = new Map<string, any>();
  if (assetIds.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: assets } = await supabaseAdmin
      .from("media_assets")
      .select("id, storage_bucket, storage_path, review_state, metadata")
      .in("id", assetIds);
    for (const a of (assets ?? []) as any[]) assetById.set(a.id, a);
  }
  const coverUrlByPlace = new Map<string, string | null>();
  if (assetIds.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const placeId of placeIds) {
      const own = mediaLinks
        .filter((l) => l.place_id === placeId)
        .sort((a, b) => (a.role === "cover" ? -1 : 0) - (b.role === "cover" ? -1 : 0) || a.sort_order - b.sort_order);
      let url: string | null = null;
      for (const link of own) {
        const asset = assetById.get(link.media_asset_id);
        if (!asset || asset.review_state !== "approved") continue;
        if ((asset.metadata as Record<string, unknown> | null)?.ai_generated === true) continue;
        if (!asset.storage_bucket || !asset.storage_path) continue;
        const { data: signed } = await supabaseAdmin.storage
          .from(asset.storage_bucket)
          .createSignedUrl(asset.storage_path, 60 * 60);
        url = signed?.signedUrl ?? null;
        if (url) break;
      }
      coverUrlByPlace.set(placeId, url);
    }
  }

  /* Fail-closed territorial: un lugar sólo es públicamente navegable si su
     destino también es público (RLS anon: destinos published y no
     eliminados). Sin destino resoluble no existe URL canónica
     /oriente-maya/:destino/lugares/:slug → el lugar NO se lista. */
  const navigablePlaces = places.filter(
    (p) => typeof p.destination_id === "string" && destById.has(p.destination_id),
  );

  return navigablePlaces.map((p) => {
    const destination = destById.get(p.destination_id) ?? null;
    const type = p.place_type_id ? (typeById.get(p.place_type_id) ?? null) : null;
    const zoneRow = p.destination_zone_id ? (zoneById.get(p.destination_zone_id) ?? null) : null;
    /* Fail-closed territorial: la zona sólo se expone si pertenece al
       destino del propio lugar. */
    const zone = zoneRow && zoneRow.destination_id === p.destination_id ? zoneRow.name : null;
    const categories = categoriesByPlace.get(p.id) ?? [];
    const amenities = strArray(p.amenities);
    const accessibility = accessibilityList(p.accessibility);

    const attractionFamily = resolvePlaceAttractionFamily(p.attraction_family, type?.attraction_family);

    const attrs: Record<string, string | string[]> = {};
    /* Clasificación principal del Inventario de Atractivos. */
    attrs.attraction_family = [attractionFamily];
    if (type) attrs.place_type = [type.slug];
    if (categories.length) attrs.experience_category = categories.map((c) => c.slug);
    if (p.admission_kind) attrs.admission_type = [p.admission_kind];
    if (zone) attrs.zone = [zone];
    if (accessibility.length) attrs.accessibility = accessibility;
    if (amenities.length) attrs.amenities = amenities;
    if (p.visit_duration_minutes != null)
      attrs.duration = [durationFilterBucket(Number(p.visit_duration_minutes))];
    if (p.best_time_to_visit) attrs.best_time = [String(p.best_time_to_visit)];

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      short_description: p.short_description ?? null,
      type_slug: type?.slug ?? null,
      type_label: type?.name ?? null,
      attraction_family: attractionFamily,
      destination_slug: destination?.slug ?? null,
      destination_name: destination?.name ?? null,
      zone_name: zone,
      latitude: p.latitude != null ? Number(p.latitude) : null,
      longitude: p.longitude != null ? Number(p.longitude) : null,
      admission_kind: p.admission_kind ?? null,
      price_from: p.price_from != null ? Number(p.price_from) : null,
      price_to: p.price_to != null ? Number(p.price_to) : null,
      price_currency: p.price_currency ?? null,
      visit_duration_minutes: p.visit_duration_minutes ?? null,
      best_time_to_visit: p.best_time_to_visit ?? null,
      amenities,
      accessibility,
      categories,
      cover_url: coverUrlByPlace.get(p.id) ?? null,
      filter_attributes: attrs,
    } satisfies PublicPlaceCard;
  });
}
