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
import type { PublicPlaceDTO, PublicPlaceMediaDTO } from "./place-public-contract";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

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
async function signPlaceMedia(
  sb: any,
  placeId: string,
): Promise<PublicPlaceMediaDTO[]> {
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
        "contact_whatsapp, contact_email, contact_website, social_links, metadata",
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
      ? sb.from("place_types").select("slug, name").eq("id", place.place_type_id).maybeSingle()
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
