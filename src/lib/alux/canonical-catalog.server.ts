/**
 * G8-R1-D1 · Catálogo canónico recomendable de Alux IA.
 *
 * Capa SERVIDOR (sin React, sin flags, sin mutación) que entrega a Alux el
 * universo de candidatos recomendables MÁS ALLÁ de `businesses`, usando
 * exclusivamente:
 *
 *   · Las lecturas públicas ya existentes por familia (policies `*_public_read`).
 *   · El resolutor canónico `canonical-entity-resolver` para clasificar familia.
 *   · Los patrones de ruta ya acreditados en `canonical-entity-binding`.
 *
 * Prohibido (y no implementado aquí): un tercer catálogo, una tabla espejo,
 * un índice paralelo o rutas inventadas.
 *
 * Fail-closed vinculante — un candidato SÓLO es recomendable si:
 *   1. `status = 'published'`.
 *   2. `deleted_at IS NULL`.
 *   3. Tiene `slug` y nombre editorial no vacíos.
 *   4. Su ruta canónica se puede construir con TODOS sus ancestros reales.
 *   5. Su familia canónica es reconocida por el resolutor.
 *
 * Consecuencia acreditada: entidades en borrador (p. ej. Chichén Itzá o
 * Ek' Balam mientras sigan en `draft`) NUNCA entran al conjunto de
 * candidatos. Las Landings SEO no son entidades: no se leen aquí y jamás
 * se recomiendan como ficha; el destino de toda sugerencia es la entidad
 * canónica.
 *
 * Zonas (`destination_zones`): quedan DECLARADAS pero BLOQUEADAS como
 * candidato recomendable porque hoy no existe una ruta pública propia
 * acreditada para una zona (`/oriente-maya/{destino}/{zona}` colisiona con
 * el segmento de categoría). Fail-closed antes que enlace roto.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveCanonicalEntityTemplate,
  type CanonicalEntityFamily,
} from "@/lib/experience-builder/canonical-entity-resolver";

export const ALUX_CANONICAL_CATALOG_VERSION = "1.0.0" as const;

/** Tipo de entidad canónica que Alux puede proponer. */
export type AluxCandidateKind = "business" | "product" | "event" | "place" | "destination";

export interface AluxCanonicalCandidate {
  readonly entityKind: AluxCandidateKind;
  readonly entityId: string;
  readonly slug: string;
  readonly label: string;
  /** Ruta canónica REAL del router (nunca compuesta a mano en la UI). */
  readonly canonicalUrl: string;
  /** Familia acreditada por `canonical-entity-resolver` (null si genérica). */
  readonly family: CanonicalEntityFamily | null;
  readonly summary: string | null;
  readonly categorySlug: string | null;
  readonly categoryName: string | null;
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
}

export interface LoadCanonicalCandidatesInput {
  readonly destinationId: string;
  readonly destinationSlug: string;
  /** Ids de empresas publicadas del destino ya resueltos por el llamador. */
  readonly publishedBusinessIds: readonly string[];
  /** Mapa businessId → { slug, categorySlug, name } de empresas publicadas. */
  readonly businessIndex: ReadonlyMap<
    string,
    { slug: string; categorySlug: string; name: string }
  >;
  readonly limitPerFamily?: number;
}

export interface CanonicalCatalogResult {
  readonly candidates: readonly AluxCanonicalCandidate[];
  /** Diagnóstico por familia (auditoría R1-D, no se expone al modelo). */
  readonly familyReport: Readonly<Record<string, { loaded: number; eligible: number; note: string }>>;
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
  const familyReport: Record<string, { loaded: number; eligible: number; note: string }> = {};

  // ── Lugares y atractivos (points_of_interest → premium-entity-place) ──
  {
    const { data, error } = await sb
      .from("points_of_interest")
      .select(
        "id, slug, name, official_name, short_description, description, place_types ( slug, name )",
      )
      .eq("destination_id", input.destinationId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(limit);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.official_name) || clean(row.name);
      if (!slug || !label) continue;
      const pt = (row.place_types as { slug?: unknown; name?: unknown } | null) ?? null;
      const placeType = clean(pt?.slug);
      const resolution = resolveCanonicalEntityTemplate({
        entityId: String(row.id),
        entityType: "place",
        placeType: placeType || null,
      });
      // Fail-closed: variante de lugar no reconocida ⇒ no recomendable.
      if (resolution.canonicalFamily !== "place") continue;
      eligible++;
      candidates.push({
        entityKind: "place",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl: `/oriente-maya/${input.destinationSlug}/lugares/${slug}`,
        family: "place",
        summary: clean(row.short_description) || clean(row.description) || null,
        categorySlug: placeType || null,
        categoryName: clean(pt?.name) || null,
        source: { table: "points_of_interest", id: String(row.id) },
        eligibility: "publicado · variante de lugar acreditada · ruta canónica válida",
        favoriteKind: null,
        planKind: null,
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
      .order("name", { ascending: true })
      .limit(limit * 2);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.name);
      const bizId = clean(row.business_id);
      if (!slug || !label || !bizId) continue;
      // La empresa dueña debe estar publicada y con ruta canónica resuelta.
      if (!input.businessIndex.has(bizId)) continue;
      const resolution = resolveCanonicalEntityTemplate({
        entityId: String(row.id),
        entityType: "product",
        productType: clean(row.product_type) || null,
      });
      const family = resolution.canonicalFamily;
      if (family !== "experience" && family !== "tour" && family !== "product_generic") continue;
      eligible++;
      candidates.push({
        entityKind: "product",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl: `/producto/${slug}`,
        family,
        summary: clean(row.tagline) || clean(row.description) || null,
        categorySlug: clean(row.product_type) || null,
        categoryName: null,
        source: { table: "products", id: String(row.id) },
        eligibility: "publicado · empresa publicada · familia de producto acreditada",
        favoriteKind: "product",
        planKind: "product",
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
      .order("starts_at", { ascending: true })
      .limit(limit);

    const rows = error ? [] : (data ?? []);
    let eligible = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const slug = clean(row.slug);
      const label = clean(row.title);
      if (!slug || !label) continue;
      const endsAt = clean(row.ends_at) || null;
      // Fail-closed temporal: un evento terminado no es recomendable.
      if (endsAt && endsAt < nowIso) continue;
      eligible++;
      candidates.push({
        entityKind: "event",
        entityId: String(row.id),
        slug,
        label,
        canonicalUrl: `/eventos/${slug}`,
        family: "event",
        summary: clean(row.summary) || null,
        categorySlug: "eventos",
        categoryName: "Eventos",
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

  // ── Zonas: declaradas, BLOQUEADAS como candidato (sin ruta propia) ──
  familyReport.zone = {
    loaded: 0,
    eligible: 0,
    note: "BLOQUEADO · sin ruta pública canónica propia acreditada (fail-closed)",
  };

  return { candidates, familyReport };
}
