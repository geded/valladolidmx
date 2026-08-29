/**
 * G8-R1-F1D · Catálogo del Release Candidate visual (canary interno).
 *
 * Lectura REAL y autenticada de las entidades del ecosistema para el hub
 * de revisión Founder/Admin/Editor. No publica, no cambia estados, no
 * activa flags y no crea renderers paralelos: sólo resuelve rutas
 * canónicas productivas, familia de presentación y modo vigente para que
 * el revisor humano navegue las plantillas ya desplegadas.
 *
 * Fail-closed: cualquier fallo de lectura devuelve listas vacías; jamás
 * se rellena con fixtures ni con datos inventados.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { resolvePresentationFamily } from "./presentation-family";

export type RcEntityKind = "business" | "product" | "event" | "place";

export interface RcEntityRow {
  readonly kind: RcEntityKind;
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  /** Estado editorial acreditado tal cual está en base. */
  readonly editorialState: string;
  /** Familia de presentación resuelta por el contrato puro. */
  readonly family: string | null;
  readonly familyReason: string;
  /** Ruta canónica productiva (nunca interpolada en el componente). */
  readonly canonicalPath: string | null;
  readonly destinationSlug: string | null;
  readonly categorySlug: string | null;
  /** Modo vigente persistido (`entity_presentation_modes`). */
  readonly effectiveMode: "editorial" | "cinematic";
  readonly reviewState: string;
  readonly hasApprovedCover: boolean;
  /** Motivo del fallback a Editorial cuando aplica. */
  readonly fallbackReason: string | null;
}

export interface RcCatalog {
  readonly entities: readonly RcEntityRow[];
  readonly generatedAt: string;
  readonly readError: string | null;
}

type Ctx = { supabase: SupabaseClient<Database> };

function path(...segments: (string | null | undefined)[]): string | null {
  if (segments.some((s) => !s)) return null;
  return `/oriente-maya/${segments.map((s) => encodeURIComponent(s as string)).join("/")}`;
}

export const listReleaseCandidateCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RcCatalog> => {
    const { supabase } = context as unknown as Ctx;
    const generatedAt = new Date().toISOString();

    try {
      const [dests, cats, biz, prods, evts, places, modes] = await Promise.all([
        supabase.from("destinations").select("id, slug"),
        supabase.from("business_category_links").select("business_id, business_categories(slug)"),
        supabase
          .from("businesses")
          .select("id, slug, display_name, status, destination_id")
          .limit(200),
        supabase
          .from("products")
          .select("id, slug, name, status, product_type, business_id")
          .limit(200),
        supabase.from("events").select("id, slug, title, status").limit(100),
        supabase
          .from("points_of_interest")
          .select("id, slug, status, destination_id, place_types(slug)")
          .limit(200),
        supabase
          .from("entity_presentation_modes")
          .select(
            "entity_kind, entity_id, approved_mode, review_state, cover_media_asset_id, reason",
          )
          .limit(500),
      ]);

      const destSlug = new Map<string, string>();
      for (const d of dests.data ?? []) destSlug.set(d.id, d.slug);

      const catSlug = new Map<string, string>();
      for (const link of (cats.data ?? []) as Array<{
        business_id: string;
        business_categories: { slug: string } | { slug: string }[] | null;
      }>) {
        const raw = link.business_categories;
        const slug = Array.isArray(raw) ? raw[0]?.slug : raw?.slug;
        if (slug && !catSlug.has(link.business_id)) catSlug.set(link.business_id, slug);
      }

      type ModeRow = {
        entity_kind: string;
        entity_id: string;
        approved_mode: string | null;
        review_state: string | null;
        cover_media_asset_id: string | null;
        reason: string | null;
      };
      const modeMap = new Map<string, ModeRow>();
      for (const m of (modes.data ?? []) as unknown as ModeRow[])
        modeMap.set(`${m.entity_kind}:${m.entity_id}`, m);

      const decorate = (
        kind: RcEntityKind,
        id: string,
      ): Pick<
        RcEntityRow,
        "effectiveMode" | "reviewState" | "hasApprovedCover" | "fallbackReason"
      > => {
        const m = modeMap.get(`${kind}:${id}`);
        const hasApprovedCover = Boolean(m?.cover_media_asset_id) && m?.review_state === "approved";
        const effectiveMode: "editorial" | "cinematic" =
          m?.approved_mode === "cinematic" && hasApprovedCover ? "cinematic" : "editorial";
        return {
          effectiveMode,
          reviewState: m?.review_state ?? "not_requested",
          hasApprovedCover,
          fallbackReason:
            effectiveMode === "editorial" && m?.approved_mode === "cinematic"
              ? (m?.reason ?? "portada gobernada no elegible")
              : null,
        };
      };

      const entities: RcEntityRow[] = [];
      const bizIndex = new Map<string, { slug: string; dest: string | null; cat: string | null }>();

      for (const b of biz.data ?? []) {
        const dest = b.destination_id ? (destSlug.get(b.destination_id) ?? null) : null;
        const cat = catSlug.get(b.id) ?? null;
        bizIndex.set(b.id, { slug: b.slug, dest, cat });
        const fam = resolvePresentationFamily({
          entityId: b.id,
          entityType: "business",
          categorySlug: cat,
        });
        entities.push({
          kind: "business",
          id: b.id,
          slug: b.slug,
          label: b.display_name ?? b.slug,
          editorialState: String(b.status),
          family: fam.family,
          familyReason: fam.reason,
          canonicalPath: path(dest, cat, b.slug),
          destinationSlug: dest,
          categorySlug: cat,
          ...decorate("business", b.id),
        });
      }

      for (const p of prods.data ?? []) {
        const parent = p.business_id ? bizIndex.get(p.business_id) : undefined;
        const fam = resolvePresentationFamily({
          entityId: p.id,
          entityType: "product",
          productType: p.product_type as string | null,
          categorySlug: parent?.cat ?? null,
        });
        entities.push({
          kind: "product",
          id: p.id,
          slug: p.slug,
          label: (p.name as string | null) ?? p.slug,
          editorialState: String(p.status),
          family: fam.family,
          familyReason: fam.reason,
          canonicalPath: path(parent?.dest, parent?.cat, parent?.slug, p.slug),
          destinationSlug: parent?.dest ?? null,
          categorySlug: parent?.cat ?? null,
          ...decorate("product", p.id),
        });
      }

      for (const e of evts.data ?? []) {
        const fam = resolvePresentationFamily({ entityId: e.id, entityType: "event" });
        entities.push({
          kind: "event",
          id: e.id,
          slug: e.slug,
          label: (e.title as string | null) ?? e.slug,
          editorialState: String(e.status),
          family: fam.family,
          familyReason: fam.reason,
          canonicalPath: `/eventos/${encodeURIComponent(e.slug)}`,
          destinationSlug: null,
          categorySlug: null,
          ...decorate("event", e.id),
        });
      }

      for (const pl of (places.data ?? []) as Array<{
        id: string;
        slug: string;
        status: string;
        destination_id: string | null;
        place_types: { slug: string } | { slug: string }[] | null;
      }>) {
        const dest = pl.destination_id ? (destSlug.get(pl.destination_id) ?? null) : null;
        const rawType = pl.place_types;
        const placeType = Array.isArray(rawType) ? (rawType[0]?.slug ?? null) : (rawType?.slug ?? null);
        const fam = resolvePresentationFamily({
          entityId: pl.id,
          entityType: "place",
          placeType,
        });
        entities.push({
          kind: "place",
          id: pl.id,
          slug: pl.slug,
          label: pl.slug,
          editorialState: String(pl.status),
          family: fam.family,
          familyReason: fam.reason,
          canonicalPath: dest
            ? `/oriente-maya/${encodeURIComponent(dest)}/lugares/${encodeURIComponent(pl.slug)}`
            : null,
          destinationSlug: dest,
          categorySlug: placeType,
          ...decorate("place", pl.id),
        });
      }

      return { entities, generatedAt, readError: null };
    } catch (err) {
      return {
        entities: [],
        generatedAt,
        readError: err instanceof Error ? err.message : "read_failed",
      };
    }
  });
