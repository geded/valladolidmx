/**
 * G8-R1-D1 · Catálogo canónico recomendable de Alux IA.
 * G8-R1-D-R1 · Remediación DEF-R1D-002 (candidatos sin ficha pública) y
 * DEF-R1D-003 (URL canónica desde el binding oficial).
 *
 * Capa SERVIDOR (sin React, sin flags, sin mutación) que entrega a Alux el
 * universo de candidatos recomendables MÁS ALLÁ de `businesses`, usando
 * exclusivamente:
 *
 *   · Las lecturas públicas ya existentes por familia (policies `*_public_read`).
 *   · El resolutor canónico `canonical-entity-resolver` para clasificar familia.
 *   · `buildCanonicalEntityUrl` (canonical-entity-binding) como ÚNICA fuente
 *     de URL. Prohibida toda plantilla literal en este archivo.
 *
 * Prohibido (y no implementado aquí): un tercer catálogo, una tabla espejo,
 * un índice paralelo, una segunda tabla de rutas o rutas inventadas.
 *
 * Fail-closed ESTRUCTURAL vinculante — sin una sola petición HTTP por
 * candidato. Un candidato SÓLO es recomendable si:
 *   1. `status = 'published'` y `deleted_at IS NULL`.
 *   2. Tiene `slug` y nombre editorial no vacíos.
 *   3. Su empresa contenedora (cuando aplica) está publicada y no eliminada.
 *   4. Tiene relación territorial resoluble (destino y, si aplica, categoría).
 *   5. Su URL canónica se construye con el binding oficial (todos los
 *      ancestros presentes) — si el binding devuelve `null`, se excluye.
 *   6. Su familia canónica es reconocida por el resolutor.
 *
 * Consecuencias acreditadas:
 *   · Entidades en borrador (p. ej. Chichén Itzá o Ek' Balam mientras sigan
 *     en `draft`) NUNCA entran al conjunto de candidatos.
 *   · `tour-manglar-amanecer-demo` está publicado pero su empresa
 *     (`manglar-expediciones`) está en `draft`: el loader público no puede
 *     resolver sus dependencias, así que queda EXCLUIDO y la razón se
 *     registra en `rejected`. No se altera ni despublica el dato demo.
 *   · Las Landings SEO no son entidades: no se leen aquí y jamás se
 *     recomiendan como ficha; el destino de toda sugerencia es la entidad
 *     canónica.
 *
 * Zonas (`destination_zones`): sirven como filtro y contexto territorial,
 * pero quedan BLOQUEADAS como candidato recomendable porque hoy no existe
 * ficha pública propia acreditada. Rutas/itinerarios: fuera del catálogo,
 * no existe entidad pública canónica. Fail-closed antes que enlace roto.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveCanonicalEntityTemplate,
  type CanonicalEntityFamily,
} from "@/lib/experience-builder/canonical-entity-resolver";
import { PILOT_NON_DEMO_FILTER } from "@/lib/omxds/pilot-allowlist";
import { buildCanonicalEntityUrl } from "@/lib/experience-builder/canonical-entity-binding";
import { isValidPoint, type AccreditedCoords, type CoordsSource } from "@/lib/alux/proximity";

export const ALUX_CANONICAL_CATALOG_VERSION = "1.2.0" as const;

/** Coordenada acreditada o `null`. Nunca aproxima ni inventa. */
function accredit(lat: unknown, lng: unknown, source: CoordsSource): AccreditedCoords | null {
  const point = { lat: Number(lat), lng: Number(lng) };
  return isValidPoint(point) ? { ...point, source } : null;
}

/** Tipo de entidad canónica que Alux puede proponer. */
export type AluxCandidateKind = "business" | "product" | "event" | "place" | "destination";

export interface AluxCanonicalCandidate {
  readonly entityKind: AluxCandidateKind;
  readonly entityId: string;
  readonly slug: string;
  readonly label: string;
  /** Ruta canónica REAL del router (siempre vía `buildCanonicalEntityUrl`). */
  readonly canonicalUrl: string;
  /** Familia acreditada por `canonical-entity-resolver` (null si genérica). */
  readonly family: CanonicalEntityFamily | null;
  readonly summary: string | null;
  readonly categorySlug: string | null;
  readonly categoryName: string | null;
  /** Zona territorial validada contra el destino (null si no acreditada). */
  readonly zoneSlug: string | null;
  /** Tabla + id de origen (contrato Explainable-by-Default). */
  readonly source: { readonly table: string; readonly id: string };
  /** Motivo declarado de elegibilidad (auditable). */
  readonly eligibility: string;
  /** Kind aceptado por `toggleFavorite` (null ⇒ acción "Guardar" no aplica). */
  readonly favoriteKind: "business" | "product" | null;
  /** Kind aceptado por `addPlanItem` (null ⇒ acción "Mi Viaje" no aplica). */
  readonly planKind: "destination" | "business" | "product" | "event" | null;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
  /**
   * G8-R1-E-R1 · DEF-R1E-002 — Coordenadas ACREDITADAS del candidato.
   * `null` cuando la entidad no tiene ubicación almacenada: en ese caso el
   * candidato sigue siendo recomendable por afinidad y territorio, pero
   * nunca recibe etiqueta de distancia ni entra en orden "Cerca de mí".
   * Prohibido inventar centroides.
   */
  readonly coords?: AccreditedCoords | null;
}

/** Candidato descartado + razón auditable (nunca se expone al modelo). */
export interface AluxRejectedCandidate {
  readonly table: string;
  readonly slug: string;
  readonly reason: string;
}

export interface LoadCanonicalCandidatesInput {
  readonly destinationId: string;
  readonly destinationSlug: string;
  /** Ids de empresas publicadas del destino ya resueltos por el llamador. */
  readonly publishedBusinessIds: readonly string[];
  /** Mapa businessId → { slug, categorySlug, name } de empresas publicadas. */
  readonly businessIndex: ReadonlyMap<string, { slug: string; categorySlug: string; name: string }>;
  readonly limitPerFamily?: number;
}

export interface CanonicalCatalogResult {
  readonly candidates: readonly AluxCanonicalCandidate[];
  readonly rejected: readonly AluxRejectedCandidate[];
  /** Diagnóstico por familia (auditoría R1-D, no se expone al modelo). */
  readonly familyReport: Readonly<
    Record<string, { loaded: number; eligible: number; note: string }>
  >;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Carga los candidatos canónicos NO-empresa del destino activo
 * (lugares, productos/experiencias/tours y eventos publicados).
 *
 * Las empresas ya se resuelven en el flujo existente de
 * `aluxContextualSuggest`; aquí no se duplican.
 */
export async function loadAluxCanonicalCandidates(
  sb: SupabaseClient,
  input: LoadCanonicalCandidatesInput,
): Promise<CanonicalCatalogResult> {
  const limit = input.limitPerFamily ?? 12;
  const candidates: AluxCanonicalCandidate[] = [];
  const rejected: AluxRejectedCandidate[] = [];
  const familyReport: Record<string, { loaded: number; eligible: number; note: string }> = {};

  /**
   * DEF-R1E-002 · Ubicación canónica publicada de las empresas del destino.
   * Un producto/experiencia/tour sin ubicación propia HEREDA la de su
   * empresa operadora, declarando el origen (`product_operator`).
   */
  const businessCoords = new Map<string, AccreditedCoords>();
  if (input.publishedBusinessIds.length) {
    const { data } = await sb
      .from("business_locations")
      .select("business_id, latitude, longitude, is_primary")
      .in("business_id", input.publishedBusinessIds as string[]);
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const bizId = clean(row.business_id);
      if (!bizId) continue;
      if (businessCoords.has(bizId) && row.is_primary !== true) continue;
      const point = accredit(row.latitude, row.longitude, "business_location");
      if (point) businessCoords.set(bizId, point);
    }
  }

  // ── Lugares y atractivos (points_of_interest → premium-entity-place) ──
  {
    const { data, error } = await sb
      .from("points_of_interest")
      .select(
        "id, slug, name, official_name, short_description, description, destination_zone_id, latitude, longitude, place_types ( slug, name ), destination_zones ( slug, destination_id )",
      )
      .eq("destination_id", input.destinationId)
      .eq("status", "published")
      .is("deleted_at", null)
      .or(PILOT_NON_DEMO_FILTER)
      .order("name", { ascending: true })
      .limit(limit);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.official_name) || clean(row.name);
      if (!slug || !label) {
        rejected.push({
          table: "points_of_interest",
          slug: slug || String(row.id),
          reason: "sin slug o nombre editorial",
        });
        continue;
      }
      const pt = (row.place_types as { slug?: unknown; name?: unknown } | null) ?? null;
      const placeType = clean(pt?.slug);
      const resolution = resolveCanonicalEntityTemplate({
        entityId: String(row.id),
        entityType: "place",
        placeType: placeType || null,
      });
      // Fail-closed: variante de lugar no reconocida ⇒ no recomendable.
      if (resolution.canonicalFamily !== "place") {
        rejected.push({
          table: "points_of_interest",
          slug,
          reason: "variante de lugar no acreditada por el resolutor",
        });
        continue;
      }
      const canonicalUrl = buildCanonicalEntityUrl({
        entityType: "place",
        slug,
        destinationSlug: input.destinationSlug,
      });
      if (!canonicalUrl) {
        rejected.push({
          table: "points_of_interest",
          slug,
          reason: "ruta canónica no construible (binding oficial devolvió null)",
        });
        continue;
      }
      eligible++;
      candidates.push({
        entityKind: "place",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl,
        family: "place",
        summary: clean(row.short_description) || clean(row.description) || null,
        categorySlug: placeType || null,
        categoryName: clean(pt?.name) || null,
        zoneSlug: resolveZoneSlug(row.destination_zones, input.destinationId),
        source: { table: "points_of_interest", id: String(row.id) },
        eligibility: "publicado · variante de lugar acreditada · ruta canónica válida",
        favoriteKind: null,
        planKind: null,
        coords: accredit(row.latitude, row.longitude, "poi"),
      });
    }
    familyReport.place = {
      loaded: rows.length,
      eligible,
      note: error
        ? "lectura pública no disponible"
        : "premium-entity-place · borradores excluidos por policy",
    };
  }

  // ── Productos: experiencias, tours y producto genérico ──
  if (input.publishedBusinessIds.length) {
    const { data, error } = await sb
      .from("products")
      .select("id, slug, name, tagline, description, product_type, business_id")
      .in("business_id", input.publishedBusinessIds as string[])
      .eq("status", "published")
      .is("deleted_at", null)
      .or(PILOT_NON_DEMO_FILTER)
      .order("name", { ascending: true })
      .limit(limit * 2);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.name);
      const bizId = clean(row.business_id);
      if (!slug || !label || !bizId) {
        rejected.push({
          table: "products",
          slug: slug || String(row.id),
          reason: "sin slug, nombre o empresa contenedora",
        });
        continue;
      }
      // DEF-R1D-002 · La empresa dueña debe estar publicada, no eliminada y
      // con relación territorial resoluble. El índice sólo contiene empresas
      // que cumplen esa condición: si falta, el loader público de
      // `/producto/$slug` tampoco podría resolver sus dependencias.
      const biz = input.businessIndex.get(bizId);
      if (!biz) {
        rejected.push({
          table: "products",
          slug,
          reason: "empresa contenedora no publicada o sin ficha pública resoluble",
        });
        continue;
      }
      const resolution = resolveCanonicalEntityTemplate({
        entityId: String(row.id),
        entityType: "product",
        productType: clean(row.product_type) || null,
      });
      const family = resolution.canonicalFamily;
      if (family !== "experience" && family !== "tour" && family !== "product_generic") {
        rejected.push({
          table: "products",
          slug,
          reason: `familia de producto no recomendable (${family ?? "desconocida"})`,
        });
        continue;
      }
      const canonicalUrl = buildCanonicalEntityUrl({
        entityType: "product",
        slug,
        destinationSlug: input.destinationSlug,
        categorySlug: biz.categorySlug,
        businessSlug: biz.slug,
      });
      if (!canonicalUrl) {
        rejected.push({
          table: "products",
          slug,
          reason: "ruta canónica no construible (falta destino, categoría o empresa)",
        });
        continue;
      }
      eligible++;
      candidates.push({
        entityKind: "product",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl,
        family,
        summary: clean(row.tagline) || clean(row.description) || null,
        categorySlug: clean(row.product_type) || null,
        categoryName: null,
        zoneSlug: null,
        source: { table: "products", id: String(row.id) },
        eligibility:
          "publicado · empresa publicada con ficha resoluble · ruta canónica construida por el binding",
        favoriteKind: "product",
        planKind: "product",
        coords: businessCoords.has(bizId)
          ? { ...(businessCoords.get(bizId) as AccreditedCoords), source: "product_operator" }
          : null,
      });
    }
    familyReport.product = {
      loaded: rows.length,
      eligible,
      note: "experiencia · tour · producto genérico (empresa publicada obligatoria)",
    };
  } else {
    familyReport.product = { loaded: 0, eligible: 0, note: "destino sin empresas publicadas" };
  }

  // ── Eventos ──
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await sb
      .from("events")
      .select("id, slug, title, summary, starts_at, ends_at")
      .eq("destination_id", input.destinationId)
      .eq("status", "published")
      .is("deleted_at", null)
      .or(PILOT_NON_DEMO_FILTER)
      .order("starts_at", { ascending: true })
      .limit(limit);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.title);
      if (!slug || !label) {
        rejected.push({
          table: "events",
          slug: slug || String(row.id),
          reason: "sin slug o título editorial",
        });
        continue;
      }
      const endsAt = clean(row.ends_at) || null;
      // Fail-closed temporal: un evento terminado no es recomendable.
      if (endsAt && endsAt < nowIso) {
        rejected.push({ table: "events", slug, reason: "evento finalizado" });
        continue;
      }
      const canonicalUrl = buildCanonicalEntityUrl({ entityType: "event", slug });
      if (!canonicalUrl) {
        rejected.push({ table: "events", slug, reason: "ruta canónica no construible" });
        continue;
      }
      eligible++;
      candidates.push({
        entityKind: "event",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl,
        family: "event",
        summary: clean(row.summary) || null,
        categorySlug: "eventos",
        categoryName: "Eventos",
        zoneSlug: null,
        source: { table: "events", id: String(row.id) },
        eligibility: "publicado · vigente · ruta canónica válida",
        favoriteKind: null,
        planKind: "event",
        startsAt: clean(row.starts_at) || null,
        endsAt,
      });
    }
    familyReport.event = {
      loaded: rows.length,
      eligible,
      note: error ? "lectura pública no disponible" : "eventos vigentes del destino",
    };
  }

  // ── Destinos publicados: candidatos SÓLO con ficha canónica resoluble ──
  {
    const { data, error } = await sb
      .from("destinations")
      .select("id, slug, name")
      .eq("status", "published")
      .is("deleted_at", null)
      .or(PILOT_NON_DEMO_FILTER)
      .neq("id", input.destinationId)
      .order("name", { ascending: true })
      .limit(limit);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.name);
      if (!slug || !label) continue;
      const canonicalUrl = buildCanonicalEntityUrl({ entityType: "destination", slug });
      if (!canonicalUrl) {
        rejected.push({ table: "destinations", slug, reason: "ruta canónica no construible" });
        continue;
      }
      eligible++;
      candidates.push({
        entityKind: "destination",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl,
        family: null,
        summary: null,
        categorySlug: null,
        categoryName: null,
        zoneSlug: null,
        source: { table: "destinations", id: String(row.id) },
        eligibility: "destino publicado · ficha canónica pública resoluble",
        favoriteKind: null,
        planKind: "destination",
      });
    }
    familyReport.destination = {
      loaded: rows.length,
      eligible,
      note: error ? "lectura pública no disponible" : "destinos publicados del Oriente Maya",
    };
  }

  // ── Zonas: filtro y contexto territorial, BLOQUEADAS como candidato ──
  familyReport.zone = {
    loaded: 0,
    eligible: 0,
    note: "BLOQUEADO como candidato · sólo filtro/contexto (sin ficha pública acreditada)",
  };

  // ── Rutas / itinerarios: sin entidad pública canónica ──
  familyReport.route = {
    loaded: 0,
    eligible: 0,
    note: "FUERA DEL CATÁLOGO · no existe entidad pública canónica (limitación registrada)",
  };

  return { candidates, rejected, familyReport };
}

/**
 * DEF-R1D-004 · Zona validada: sólo se acredita cuando la zona pertenece
 * realmente al destino de la entidad. Nunca se infiere por texto ni cercanía.
 */
export function resolveZoneSlug(zone: unknown, destinationId: string): string | null {
  const z = (zone as { slug?: unknown; destination_id?: unknown } | null) ?? null;
  if (!z) return null;
  const slug = clean(z.slug);
  if (!slug) return null;
  if (clean(z.destination_id) !== destinationId) return null;
  return slug;
}
