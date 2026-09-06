/**
 * Lote 3K · Recuperación CMS-first para Alux conversacional (server-only).
 *
 * Reúne, con las MISMAS autoridades de elegibilidad que el resto de la
 * plataforma, los candidatos de las ocho familias públicas:
 *
 *   destino · hotel · restaurante · casa de vacaciones · experiencia ·
 *   lugar · evento · ruta
 *
 * Fuentes reutilizadas (sin motor paralelo):
 *  · empresas publicadas: `applyPublicBusinessEligibility` (DEF-F1I-001) +
 *    `buildCanonicalEntityUrl` (DEF-F1I-002) + `computeOpenNow` (A7);
 *  · lugares / experiencias / eventos / destinos: `loadAluxCanonicalCandidates`
 *    (catálogo canónico R1-D) con corpus demo administrable incluido (3J.3);
 *  · rutas editoriales publicadas: `editorial_routes` (Lote 3C).
 *
 * Cada candidato lleva HECHOS confirmados (con id citable) y la lista de
 * datos NO disponibles. El modelo nunca ve tablas: sólo este contrato.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCanonicalEntityUrl } from "@/lib/experience-builder/canonical-entity-binding";
import { PUBLIC_BUSINESS_ELIGIBILITY_EQ } from "@/lib/omxds/public-eligibility";
import { computeOpenNow } from "@/lib/business/open-now";
import { PUEBLOS_MAGICOS_AUTORIZADOS } from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";
import {
  loadAluxCanonicalCandidates,
  type AluxCanonicalCandidate,
} from "./canonical-catalog.server";
import {
  normalizeText,
  sanitizeCmsText,
  type AluxConverseCandidate,
  type AluxConverseFact,
  type AluxConverseFamily,
  type AluxConverseScope,
  type AluxUnavailableFactKind,
} from "./converse-contract";

const TZ = "America/Merida";
/** Ruta pública canónica de rutas editoriales (`src/routes/rutas.$slug.tsx`). */
const ROUTE_PUBLIC_PATH = "/rutas/{slug}";

export interface ConverseDestination {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface ConverseRetrievalInput {
  readonly destinationSlug: string | null;
  /** Destinos adicionales mencionados (se rotulan como cercanía). */
  readonly extraDestinationSlugs?: readonly string[];
  readonly nowIso?: string;
}

export interface ConverseRetrievalResult {
  readonly candidates: readonly AluxConverseCandidate[];
  readonly destination: ConverseDestination | null;
  readonly knownDestinations: readonly ConverseDestination[];
  readonly familiesLoaded: readonly string[];
  readonly scope: "destination" | "region" | "none";
}

/* ─────────────────────────── helpers ─────────────────────────── */

let factCounter = 0;
function fact(text: string): AluxConverseFact {
  factCounter += 1;
  return { id: `F${factCounter}`, text: text.replace(/\s+/g, " ").trim().slice(0, 140) };
}

function humanize(value: unknown): string {
  return typeof value === "string" ? value.replace(/[-_]/g, " ").trim() : "";
}

function listOf(value: unknown, max = 4): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => humanize(v))
    .filter((v) => v.length > 0)
    .slice(0, max);
}

function familyFromCategory(slug: string): AluxConverseFamily {
  const s = normalizeText(slug);
  if (s === "hoteles" || s === "hospedaje") return "hotel";
  if (s === "restaurantes" || s === "gastronomia") return "restaurante";
  if (s === "casas-de-vacaciones" || s === "casas de vacaciones") return "casa";
  if (
    s === "experiencias" ||
    s === "experiencias-tours" ||
    s === "tours" ||
    s === "cenotes" ||
    s === "naturaleza" ||
    s === "cultura"
  )
    return "experiencia";
  return "otra";
}

function tagsForFamily(f: AluxConverseFamily): string[] {
  switch (f) {
    case "hotel":
      return ["hospedaje", "relax"];
    case "casa":
      return ["hospedaje", "casa-vacaciones", "familias"];
    case "restaurante":
      return ["gastronomia"];
    case "experiencia":
      return ["experiencias"];
    case "lugar":
      return ["lugares", "cultura-maya"];
    case "evento":
      return ["eventos"];
    case "ruta":
      return ["rutas"];
    case "destino":
      return ["lugares"];
    default:
      return [];
  }
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function money(amount: unknown, currency: unknown): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur =
    typeof currency === "string" && currency.length === 3 ? currency.toUpperCase() : "MXN";
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${cur}`;
}

type HourRow = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean | null;
};

function openStateFrom(rows: HourRow[] | undefined): {
  state: "open" | "closed" | null;
  label: string | null;
} {
  if (!rows || rows.length === 0) return { state: null, label: null };
  const r = computeOpenNow(rows, { timezone: TZ });
  return { state: r.state === "unknown" ? null : r.state, label: r.label || null };
}

/** Hechos derivados de `filter_attributes` (atributos territoriales publicados). */
function attributeFacts(raw: unknown): {
  facts: AluxConverseFact[];
  tags: string[];
  hasAccess: boolean;
  hasPrice: boolean;
} {
  const facts: AluxConverseFact[] = [];
  const tags: string[] = [];
  let hasAccess = false;
  let hasPrice = false;
  if (!raw || typeof raw !== "object") return { facts, tags, hasAccess, hasPrice };
  const a = raw as Record<string, unknown>;
  const access = listOf(a["accessibility"]);
  if (access.length) {
    facts.push(fact(`Accesibilidad: ${access.join(", ")}`));
    tags.push("accesible");
    hasAccess = true;
  }
  if (typeof a["price_level"] === "string") {
    facts.push(fact(`Nivel de precio: ${humanize(a["price_level"])}`));
    hasPrice = true;
    tags.push(`precio-${normalizeText(a["price_level"])}`);
  }
  if (typeof a["cuisine_type"] === "string")
    facts.push(fact(`Cocina: ${humanize(a["cuisine_type"])}`));
  const dietary = listOf(a["dietary_options"]);
  if (dietary.length) facts.push(fact(`Opciones: ${dietary.join(", ")}`));
  const meal = listOf(a["meal_period"]);
  if (meal.length) facts.push(fact(`Servicio: ${meal.join(", ")}`));
  if (typeof a["hotel_type"] === "string") facts.push(fact(`Tipo: ${humanize(a["hotel_type"])}`));
  if (typeof a["property_type"] === "string")
    facts.push(fact(`Propiedad: ${humanize(a["property_type"])}`));
  if (typeof a["capacity"] === "string")
    facts.push(fact(`Capacidad: ${humanize(a["capacity"])} personas`));
  const amen = listOf(a["amenities"], 5);
  if (amen.length) facts.push(fact(`Servicios: ${amen.join(", ")}`));
  const profile = listOf(a["traveler_profile"]);
  if (profile.length) {
    facts.push(fact(`Perfil: ${profile.join(", ")}`));
    for (const p of profile) tags.push(normalizeText(p));
  }
  return { facts, tags, hasAccess, hasPrice };
}

/* ─────────────────────────── carga por destino ─────────────────────────── */

async function loadBusinessesFor(
  sb: SupabaseClient,
  destination: ConverseDestination,
  scope: AluxConverseScope,
  limit: number,
): Promise<{
  candidates: AluxConverseCandidate[];
  ids: string[];
  index: Map<string, { slug: string; categorySlug: string; name: string }>;
}> {
  const { data, error } = await sb
    .from("businesses")
    .select(
      "id, slug, display_name, tagline, description, filter_attributes, business_categories!businesses_primary_category_id_fkey ( slug, name )",
    )
    .eq("destination_id", destination.id)
    .eq("status", "published")
    .is("deleted_at", null)
    .eq(...PUBLIC_BUSINESS_ELIGIBILITY_EQ)
    .order("display_name", { ascending: true })
    .limit(limit);
  if (error || !data) return { candidates: [], ids: [], index: new Map() };

  const rows = (data as Array<Record<string, unknown>>).map((row) => {
    const cat = (row["business_categories"] as { slug?: unknown; name?: unknown } | null) ?? null;
    return {
      id: String(row["id"]),
      slug: String(row["slug"]),
      name: String(row["display_name"] ?? ""),
      tagline: typeof row["tagline"] === "string" ? row["tagline"] : null,
      description: typeof row["description"] === "string" ? row["description"] : null,
      attrs: row["filter_attributes"],
      categorySlug: typeof cat?.slug === "string" ? cat.slug : "",
      categoryName: typeof cat?.name === "string" ? cat.name : "",
    };
  });
  const ids = rows.map((r) => r.id);

  const [hoursRes, locRes] = await Promise.all([
    ids.length
      ? sb
          .from("business_hours")
          .select("business_id, day_of_week, opens_at, closes_at, is_closed")
          .in("business_id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
    ids.length
      ? sb
          .from("business_locations")
          .select("business_id, latitude, longitude, is_primary")
          .in("business_id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const hoursBy = new Map<string, HourRow[]>();
  for (const h of (hoursRes.data ?? []) as Array<Record<string, unknown>>) {
    const bid = String(h["business_id"]);
    const arr = hoursBy.get(bid) ?? [];
    arr.push({
      day_of_week: Number(h["day_of_week"]),
      opens_at: (h["opens_at"] as string | null) ?? null,
      closes_at: (h["closes_at"] as string | null) ?? null,
      is_closed: (h["is_closed"] as boolean | null) ?? null,
    });
    hoursBy.set(bid, arr);
  }
  const coordsBy = new Map<string, { lat: number; lng: number }>();
  for (const l of (locRes.data ?? []) as Array<Record<string, unknown>>) {
    const bid = String(l["business_id"]);
    if (coordsBy.has(bid) && l["is_primary"] !== true) continue;
    const lat = Number(l["latitude"]);
    const lng = Number(l["longitude"]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0))
      coordsBy.set(bid, { lat, lng });
  }

  const index = new Map<string, { slug: string; categorySlug: string; name: string }>();
  const candidates: AluxConverseCandidate[] = [];
  for (const r of rows) {
    const href = buildCanonicalEntityUrl({
      entityType: "business",
      slug: r.slug,
      destinationSlug: destination.slug,
      categorySlug: r.categorySlug,
    });
    if (!href) continue;
    index.set(r.id, { slug: r.slug, categorySlug: r.categorySlug, name: r.name });
    const family = familyFromCategory(r.categorySlug);
    const facts: AluxConverseFact[] = [];
    const unavailable: AluxUnavailableFactKind[] = [];
    if (r.categoryName) facts.push(fact(`Categoría: ${r.categoryName}`));
    const open = openStateFrom(hoursBy.get(r.id));
    if (open.label) facts.push(fact(open.label));
    else unavailable.push("horario");
    const attrs = attributeFacts(r.attrs);
    facts.push(...attrs.facts);
    if (!attrs.hasAccess) unavailable.push("accesibilidad");
    if (!attrs.hasPrice) unavailable.push("precio");
    if (!coordsBy.has(r.id)) unavailable.push("distancia");
    unavailable.push("disponibilidad", "reconocimientos");
    const summary = sanitizeCmsText(r.tagline ?? r.description, 140) || null;
    candidates.push({
      entityType: "business",
      entityId: r.id,
      family,
      title: sanitizeCmsText(r.name, 90) || r.name,
      href,
      destinationSlug: destination.slug,
      destinationLabel: destination.name,
      scope,
      summary,
      facts,
      unavailable,
      tags: [family, ...tagsForFamily(family), ...attrs.tags, normalizeText(r.categorySlug)],
      planKind: "business",
      imageUrl: null,
      subtitle: r.categoryName || null,
      coords: coordsBy.get(r.id) ?? null,
      openState: open.state,
    });
  }
  return { candidates, ids, index };
}

async function enrichCatalog(
  sb: SupabaseClient,
  destination: ConverseDestination,
  scope: AluxConverseScope,
  catalog: readonly AluxCanonicalCandidate[],
  businessIndex: ReadonlyMap<string, { slug: string; categorySlug: string; name: string }>,
): Promise<AluxConverseCandidate[]> {
  const placeIds = catalog.filter((c) => c.entityKind === "place").map((c) => c.entityId);
  const productIds = catalog.filter((c) => c.entityKind === "product").map((c) => c.entityId);
  const eventIds = catalog.filter((c) => c.entityKind === "event").map((c) => c.entityId);

  const [placeRes, placeHoursRes, productRes, eventRes] = await Promise.all([
    placeIds.length
      ? sb
          .from("points_of_interest")
          .select(
            "id, visit_duration_minutes, best_time_to_visit, entry_fee_notes, admission_kind, price_from, price_currency, accessibility, amenities, attraction_family",
          )
          .in("id", placeIds)
      : Promise.resolve({ data: [] as unknown[] }),
    placeIds.length
      ? sb
          .from("place_hours")
          .select("place_id, day_of_week, opens_at, closes_at, is_closed")
          .in("place_id", placeIds)
      : Promise.resolve({ data: [] as unknown[] }),
    productIds.length
      ? sb
          .from("products")
          .select(
            "id, business_id, product_type, price_amount, price_currency, duration_minutes, conversion_mode, filter_attributes",
          )
          .in("id", productIds)
      : Promise.resolve({ data: [] as unknown[] }),
    eventIds.length
      ? sb.from("events").select("id, venue_name, is_free, starts_at, ends_at").in("id", eventIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const placeBy = new Map(
    (placeRes.data ?? []).map((r) => [
      String((r as Record<string, unknown>)["id"]),
      r as Record<string, unknown>,
    ]),
  );
  const placeHoursBy = new Map<string, HourRow[]>();
  for (const h of (placeHoursRes.data ?? []) as Array<Record<string, unknown>>) {
    const pid = String(h["place_id"]);
    const arr = placeHoursBy.get(pid) ?? [];
    arr.push({
      day_of_week: Number(h["day_of_week"]),
      opens_at: (h["opens_at"] as string | null) ?? null,
      closes_at: (h["closes_at"] as string | null) ?? null,
      is_closed: (h["is_closed"] as boolean | null) ?? null,
    });
    placeHoursBy.set(pid, arr);
  }
  const productBy = new Map(
    (productRes.data ?? []).map((r) => [
      String((r as Record<string, unknown>)["id"]),
      r as Record<string, unknown>,
    ]),
  );
  const eventBy = new Map(
    (eventRes.data ?? []).map((r) => [
      String((r as Record<string, unknown>)["id"]),
      r as Record<string, unknown>,
    ]),
  );

  const out: AluxConverseCandidate[] = [];
  for (const c of catalog) {
    const facts: AluxConverseFact[] = [];
    const unavailable: AluxUnavailableFactKind[] = [];
    const tags: string[] = [];
    let family: AluxConverseFamily = "otra";
    let planKind: AluxConverseCandidate["planKind"] = c.planKind;
    let openState: AluxConverseCandidate["openState"] = null;
    let subtitle: string | null = c.categoryName;

    if (c.entityKind === "place") {
      family = "lugar";
      planKind = "place";
      const p = placeBy.get(c.entityId);
      if (c.categoryName) facts.push(fact(`Tipo de lugar: ${c.categoryName}`));
      const open = openStateFrom(placeHoursBy.get(c.entityId));
      if (open.label) facts.push(fact(open.label));
      else unavailable.push("horario");
      openState = open.state;
      if (p) {
        const dur = Number(p["visit_duration_minutes"]);
        if (Number.isFinite(dur) && dur > 0) facts.push(fact(`Visita aproximada: ${dur} min`));
        else unavailable.push("duracion");
        if (typeof p["best_time_to_visit"] === "string" && p["best_time_to_visit"])
          facts.push(fact(`Mejor momento: ${sanitizeCmsText(p["best_time_to_visit"], 80)}`));
        const fee = money(p["price_from"], p["price_currency"]);
        if (fee) facts.push(fact(`Entrada desde ${fee}`));
        else if (p["admission_kind"] === "free" || p["admission_kind"] === "gratuito")
          facts.push(fact("Entrada libre"));
        else if (typeof p["entry_fee_notes"] === "string" && p["entry_fee_notes"])
          facts.push(fact(`Entrada: ${sanitizeCmsText(p["entry_fee_notes"], 80)}`));
        else unavailable.push("precio");
        const access = p["accessibility"];
        const accessList = Array.isArray(access)
          ? listOf(access)
          : access && typeof access === "object"
            ? Object.entries(access as Record<string, unknown>)
                .filter(([, v]) => v === true || (typeof v === "string" && v.length > 0))
                .map(([k, v]) =>
                  typeof v === "string" ? `${humanize(k)}: ${humanize(v)}` : humanize(k),
                )
                .slice(0, 4)
            : [];
        if (accessList.length) {
          facts.push(fact(`Accesibilidad: ${accessList.join(", ")}`));
          tags.push("accesible");
        } else unavailable.push("accesibilidad");
        if (typeof p["attraction_family"] === "string")
          tags.push(normalizeText(p["attraction_family"]));
      } else {
        unavailable.push("precio", "accesibilidad", "duracion");
      }
      if (!c.coords) unavailable.push("distancia");
      unavailable.push("reconocimientos");
    } else if (c.entityKind === "product") {
      family = "experiencia";
      planKind = "product";
      const p = productBy.get(c.entityId);
      const operator = p ? businessIndex.get(String(p["business_id"]))?.name : null;
      if (operator) {
        facts.push(fact(`Operado por ${operator}`));
        subtitle = operator;
      }
      if (p) {
        if (typeof p["product_type"] === "string") {
          facts.push(fact(`Tipo: ${humanize(p["product_type"])}`));
          tags.push(normalizeText(p["product_type"]));
        }
        const price = money(p["price_amount"], p["price_currency"]);
        if (price) facts.push(fact(`Precio publicado: ${price}`));
        else unavailable.push("precio");
        const dur = Number(p["duration_minutes"]);
        if (Number.isFinite(dur) && dur > 0) facts.push(fact(`Duración: ${dur} min`));
        else unavailable.push("duracion");
        const attrs = attributeFacts(p["filter_attributes"]);
        facts.push(...attrs.facts);
        tags.push(...attrs.tags);
        if (!attrs.hasAccess) unavailable.push("accesibilidad");
      } else unavailable.push("precio", "duracion", "accesibilidad");
      unavailable.push("horario", "disponibilidad");
    } else if (c.entityKind === "event") {
      family = "evento";
      planKind = "event";
      const e = eventBy.get(c.entityId);
      const when = formatWhen(c.startsAt ?? (e ? (e["starts_at"] as string | null) : null));
      if (when) facts.push(fact(`Fecha: ${when} (hora local)`));
      else unavailable.push("fechas");
      if (e) {
        if (typeof e["venue_name"] === "string" && e["venue_name"])
          facts.push(fact(`Sede: ${sanitizeCmsText(e["venue_name"], 60)}`));
        if (e["is_free"] === true) facts.push(fact("Entrada libre"));
        else unavailable.push("precio");
      } else unavailable.push("precio");
      unavailable.push("accesibilidad", "horario");
    } else if (c.entityKind === "destination") {
      family = "destino";
      planKind = "destination";
      if ((PUEBLOS_MAGICOS_AUTORIZADOS as readonly string[]).includes(c.slug)) {
        facts.push(fact("Pueblo Mágico"));
        tags.push("pueblo-magico");
      }
      unavailable.push("horario", "precio");
    } else {
      continue;
    }

    out.push({
      entityType: c.entityKind,
      entityId: c.entityId,
      family,
      title: sanitizeCmsText(c.label, 90) || c.label,
      href: c.canonicalUrl,
      destinationSlug: destination.slug,
      destinationLabel: destination.name,
      scope,
      summary: sanitizeCmsText(c.summary, 140) || null,
      facts,
      unavailable,
      tags: [
        family,
        ...tagsForFamily(family),
        ...tags,
        ...(c.categorySlug ? [normalizeText(c.categorySlug)] : []),
      ],
      planKind,
      imageUrl: null,
      subtitle,
      coords: c.coords ? { lat: c.coords.lat, lng: c.coords.lng } : null,
      openState,
    });
  }
  return out;
}

async function loadRoutes(
  sb: SupabaseClient,
  destinations: readonly ConverseDestination[],
  forDestination: ConverseDestination | null,
  scope: AluxConverseScope,
  limit: number,
): Promise<AluxConverseCandidate[]> {
  let q = sb
    .from("editorial_routes")
    .select(
      "id, slug, name, summary, duration_days, duration_hours, pace, difficulty, interests, audiences, destination_ids, origin_destination_id",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (forDestination) q = q.contains("destination_ids", [forDestination.id]);
  const { data, error } = await q;
  if (error || !data) return [];
  const byId = new Map(destinations.map((d) => [d.id, d] as const));
  const out: AluxConverseCandidate[] = [];
  for (const r of data as Array<Record<string, unknown>>) {
    const slug = typeof r["slug"] === "string" ? r["slug"] : "";
    const name = typeof r["name"] === "string" ? r["name"] : "";
    if (!slug || !name) continue;
    const facts: AluxConverseFact[] = [];
    const unavailable: AluxUnavailableFactKind[] = [];
    const tags: string[] = [];
    const days = Number(r["duration_days"]);
    const hours = Number(r["duration_hours"]);
    if (Number.isFinite(days) && days > 0)
      facts.push(fact(`Duración: ${days} día${days === 1 ? "" : "s"}`));
    else if (Number.isFinite(hours) && hours > 0) facts.push(fact(`Duración: ${hours} h`));
    else unavailable.push("duracion");
    if (typeof r["pace"] === "string" && r["pace"])
      facts.push(fact(`Ritmo: ${humanize(r["pace"])}`));
    if (typeof r["difficulty"] === "string" && r["difficulty"])
      facts.push(fact(`Dificultad: ${humanize(r["difficulty"])}`));
    const interests = listOf(r["interests"], 4);
    if (interests.length) {
      facts.push(fact(`Intereses: ${interests.join(", ")}`));
      for (const i of interests) tags.push(normalizeText(i));
    }
    const audiences = listOf(r["audiences"], 3);
    if (audiences.length) {
      facts.push(fact(`Para: ${audiences.join(", ")}`));
      for (const a of audiences) tags.push(normalizeText(a));
    }
    const destIds = Array.isArray(r["destination_ids"])
      ? (r["destination_ids"] as unknown[]).map(String)
      : [];
    const destNames = destIds
      .map((id) => byId.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (destNames.length) facts.push(fact(`Destinos: ${destNames.slice(0, 4).join(", ")}`));
    unavailable.push("precio", "horario", "accesibilidad");
    const origin =
      byId.get(String(r["origin_destination_id"] ?? "")) ??
      (destIds.length ? byId.get(destIds[0]!) : undefined) ??
      null;
    out.push({
      entityType: "route",
      entityId: String(r["id"]),
      family: "ruta",
      title: sanitizeCmsText(name, 90) || name,
      href: ROUTE_PUBLIC_PATH.replace("{slug}", encodeURIComponent(slug)),
      destinationSlug: forDestination?.slug ?? origin?.slug ?? null,
      destinationLabel: forDestination?.name ?? origin?.name ?? null,
      scope,
      summary: sanitizeCmsText(r["summary"], 140) || null,
      facts,
      unavailable,
      tags: ["ruta", ...tagsForFamily("ruta"), ...tags, "cultura-maya"],
      planKind: "route",
      imageUrl: null,
      subtitle: destNames.length ? destNames.slice(0, 2).join(" · ") : null,
      coords: null,
      openState: null,
    });
  }
  return out;
}

async function loadDestinationCandidates(
  sb: SupabaseClient,
  destinations: readonly ConverseDestination[],
): Promise<AluxConverseCandidate[]> {
  const ids = destinations.map((d) => d.id);
  if (!ids.length) return [];
  const { data } = await sb
    .from("destinations")
    .select("id, slug, name, tagline, description, latitude, longitude")
    .in("id", ids);
  const out: AluxConverseCandidate[] = [];
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    const slug = String(r["slug"] ?? "");
    const name = String(r["name"] ?? "");
    const href = buildCanonicalEntityUrl({ entityType: "destination", slug });
    if (!href || !name) continue;
    const facts: AluxConverseFact[] = [];
    const tags: string[] = ["destino", ...tagsForFamily("destino")];
    if ((PUEBLOS_MAGICOS_AUTORIZADOS as readonly string[]).includes(slug)) {
      facts.push(fact("Pueblo Mágico"));
      tags.push("pueblo-magico", "cultura-maya");
    }
    const lat = Number(r["latitude"]);
    const lng = Number(r["longitude"]);
    out.push({
      entityType: "destination",
      entityId: String(r["id"]),
      family: "destino",
      title: sanitizeCmsText(name, 80) || name,
      href,
      destinationSlug: slug,
      destinationLabel: name,
      scope: "region",
      summary:
        sanitizeCmsText(
          (r["tagline"] as string | null) ?? (r["description"] as string | null),
          140,
        ) || null,
      facts,
      unavailable: ["horario", "precio"],
      tags,
      planKind: "destination",
      imageUrl: null,
      subtitle: "Oriente Maya",
      coords:
        Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
          ? { lat, lng }
          : null,
      openState: null,
    });
  }
  return out;
}

/* ─────────────────────────── API ─────────────────────────── */

/**
 * Renumera los hechos citables por respuesta (`F1..Fn`) para que los ids
 * sean únicos y compactos aunque la recuperación corra en paralelo o haya
 * varias peticiones concurrentes compartiendo el contador del módulo.
 */
function renumberFacts(candidates: readonly AluxConverseCandidate[]): AluxConverseCandidate[] {
  let n = 0;
  return candidates.map((c) => ({
    ...c,
    facts: c.facts.map((f) => {
      n += 1;
      return { ...f, id: `F${n}` };
    }),
  }));
}

/** Cadena dependiente por destino: empresas → catálogo canónico → enriquecimiento. */
async function loadDestinationBundle(
  sb: SupabaseClient,
  destination: ConverseDestination,
  scope: AluxConverseScope,
  limits: { businesses: number; perFamily: number },
): Promise<AluxConverseCandidate[]> {
  const biz = await loadBusinessesFor(sb, destination, scope, limits.businesses);
  const catalog = await loadAluxCanonicalCandidates(sb, {
    destinationId: destination.id,
    destinationSlug: destination.slug,
    publishedBusinessIds: biz.ids,
    businessIndex: biz.index,
    limitPerFamily: limits.perFamily,
    includeDemoSeed: true,
  });
  const enriched = await enrichCatalog(
    sb,
    destination,
    scope,
    catalog.candidates.filter((c) => c.entityKind !== "destination"),
    biz.index,
  );
  return [...biz.candidates, ...enriched];
}

export async function retrieveConverseCandidates(
  sb: SupabaseClient,
  input: ConverseRetrievalInput,
): Promise<ConverseRetrievalResult> {
  const { data: destRows } = await sb
    .from("destinations")
    .select("id, slug, name")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(40);
  const knownDestinations: ConverseDestination[] = (
    (destRows ?? []) as Array<Record<string, unknown>>
  )
    .map((r) => ({ id: String(r["id"]), slug: String(r["slug"]), name: String(r["name"]) }))
    .filter((d) => d.id && d.slug && d.name);
  const bySlug = new Map(knownDestinations.map((d) => [d.slug, d] as const));

  const destination = input.destinationSlug ? (bySlug.get(input.destinationSlug) ?? null) : null;
  const familiesLoaded = new Set<string>();
  const collect = (list: readonly AluxConverseCandidate[]) => {
    for (const c of list) familiesLoaded.add(c.entityType);
    return list;
  };

  if (destination) {
    // Cercanías rotuladas: sólo destinos mencionados explícitamente.
    const extras = (input.extraDestinationSlugs ?? [])
      .filter((s) => s !== destination.slug)
      .map((s) => bySlug.get(s))
      .filter((d): d is ConverseDestination => Boolean(d))
      .slice(0, 2);
    // Otros destinos publicados como opción de región (planear salidas).
    const others = knownDestinations.filter((d) => d.id !== destination.id).slice(0, 8);

    const [own, routes, destCandidates, ...extraBundles] = await Promise.all([
      loadDestinationBundle(sb, destination, "destination", { businesses: 60, perFamily: 10 }),
      loadRoutes(sb, knownDestinations, destination, "destination", 6),
      loadDestinationCandidates(sb, others),
      ...extras.map(async (extra) => [
        ...(await loadDestinationBundle(sb, extra, "nearby", { businesses: 12, perFamily: 4 })),
        ...(await loadRoutes(sb, knownDestinations, extra, "nearby", 3)),
      ]),
    ]);
    const candidates = renumberFacts([
      ...collect(own),
      ...collect(routes),
      ...extraBundles.flatMap((b) => collect(b)),
      ...collect(destCandidates),
    ]);
    return {
      candidates,
      destination,
      knownDestinations,
      familiesLoaded: Array.from(familiesLoaded),
      scope: "destination",
    };
  }

  // ── Región (Home / sin destino): destinos + rutas + muestra por destino ──
  if (knownDestinations.length === 0) {
    return {
      candidates: [],
      destination: null,
      knownDestinations,
      familiesLoaded: [],
      scope: "none",
    };
  }
  // Muestra acotada por destino (empresas + catálogo) para poder proponer
  // un plan concreto desde la Home sin exceder el presupuesto de tokens.
  const sample = knownDestinations.slice(0, 7);
  const [destCandidates, routes, ...bundles] = await Promise.all([
    loadDestinationCandidates(sb, knownDestinations),
    loadRoutes(sb, knownDestinations, null, "region", 8),
    ...sample.map((d) => loadDestinationBundle(sb, d, "region", { businesses: 8, perFamily: 3 })),
  ]);
  const candidates = renumberFacts([
    ...collect(destCandidates),
    ...collect(routes),
    ...bundles.flatMap((b) => collect(b)),
  ]);
  return {
    candidates,
    destination: null,
    knownDestinations,
    familiesLoaded: Array.from(familiesLoaded),
    scope: "region",
  };
}
