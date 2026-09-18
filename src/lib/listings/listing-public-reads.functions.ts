/**
 * G8-R1 · R1-A · Lectura canónica única de los listados turísticos
 * (siete familias desde v1.1.0 · G4-PLACES).
 *
 * Reutiliza EXCLUSIVAMENTE las consultas productivas vigentes
 * (`listMarketplaceBusinesses`, `listPublishedEvents`,
 * `listPublishedPlaces`, `listPublishedDestinations`) y las proyecta al
 * DTO público único. No crea backend nuevo, no escribe, no modifica
 * estado editorial y no introduce fixtures.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { listMarketplaceBusinesses } from "@/lib/catalog/marketplace-reads.functions";
import { listPublishedEvents } from "@/lib/events/public-reads.functions";
import { listPublishedPlaces } from "@/lib/places/place-public-reads.functions";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import {
  buildPublicListing,
  isListingFamilyId,
  listingFamilyContract,
  type ListingFamilyId,
  type PublicListingDTO,
} from "./listing-public-contract";
import {
  getListingFamilyTaxonomy,
  type ListingFamilyTaxonomyResult,
} from "./listing-family-taxonomy.functions";

export interface GetPublicListingInput {
  family: ListingFamilyId;
  destino?: string | null;
  /**
   * Sólo superficies internas de revisión (`/lovable/*`, noindex): permite
   * mostrar portadas conceptuales temporales aún no aprobadas. Las lecturas
   * públicas jamás lo activan.
   */
  previewMedia?: boolean;
}

export const getPublicListing = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { family?: unknown; destino?: unknown; previewMedia?: unknown } | undefined) => ({
      family: (isListingFamilyId(data?.family) ? data?.family : "hoteles") as ListingFamilyId,
      destino: typeof data?.destino === "string" && data.destino.trim() ? data.destino : null,
      previewMedia: data?.previewMedia === true,
    }),
  )
  .handler(async ({ data }): Promise<PublicListingDTO> => {
    const contract = listingFamilyContract(data.family);

    if (contract.source === "businesses") {
      // Lote 3C — la pertenencia categoría→familia se administra en CMS.
      // Si el CMS respondió, su declaración es autoritativa (aunque esté
      // vacía). El contrato sólo actúa como fallback si la lectura falló.
      const [businesses, taxonomy] = await Promise.all([
        listMarketplaceBusinesses().catch(() => []),
        getListingFamilyTaxonomy().catch(
          (): ListingFamilyTaxonomyResult => ({
            available: false,
            taxonomy: {},
          }),
        ),
      ]);
      return buildPublicListing({
        family: contract.id,
        destino: data.destino,
        businesses,
        categorySlugs: taxonomy.available ? (taxonomy.taxonomy[contract.id] ?? []) : undefined,
      });
    }

    if (contract.source === "events") {
      const events = await listPublishedEvents({
        data: { upcomingOnly: true, limit: 60 },
      }).catch(() => []);
      return buildPublicListing({ family: contract.id, destino: data.destino, events });
    }

    if (contract.source === "places") {
      const places = await listPublishedPlaces({
        data: { destinationSlug: data.destino, previewMedia: data.previewMedia },
      }).catch(() => []);
      return buildPublicListing({ family: contract.id, destino: data.destino, places });
    }

    const [destinations, events] = await Promise.all([
      listPublishedDestinations().catch(() => []),
      listPublishedEvents({ data: { upcomingOnly: true, limit: 24 } }).catch(() => []),
    ]);
    return buildPublicListing({
      family: contract.id,
      destino: data.destino,
      destinations,
      events,
    });
  });

/**
 * Listado Premium de empresas para CUALQUIER categoría publicada en CMS
 * (cenotes, artesanías, transporte, cultura…). Usa la misma autoridad
 * visual que hoteles/restaurantes: no existe render alternativo.
 *
 * - `destino` nulo ⇒ alcance regional (Oriente Maya) con filtro por destino.
 * - `destino` presente ⇒ alcance del destino, con filtro por zonas.
 */
export const getPublicBusinessCategoryListing = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | { categorySlug?: unknown; categoryLabel?: unknown; destino?: unknown }
        | undefined,
    ) => ({
      categorySlug:
        typeof data?.categorySlug === "string" && data.categorySlug.trim()
          ? data.categorySlug.trim().toLowerCase()
          : "",
      categoryLabel:
        typeof data?.categoryLabel === "string" && data.categoryLabel.trim()
          ? data.categoryLabel.trim()
          : "",
      destino: typeof data?.destino === "string" && data.destino.trim() ? data.destino : null,
    }),
  )
  .handler(async ({ data }): Promise<PublicListingDTO> => {
    if (!data.categorySlug) {
      return buildPublicListing({ family: "empresas", destino: data.destino, categorySlugs: [] });
    }

    const businesses = await listMarketplaceBusinesses().catch(() => []);
    const dto = buildPublicListing({
      family: "empresas",
      destino: data.destino,
      businesses,
      categorySlugs: [data.categorySlug],
    });

    const label = data.categoryLabel || dto.label;
    const scope = dto.destinationLabel ?? "el Oriente Maya de Yucatán";

    return {
      ...dto,
      label,
      route: data.destino
        ? `/oriente-maya/${data.destino}/${data.categorySlug}`
        : `/oriente-maya/categoria/${data.categorySlug}`,
      hero: {
        ...dto.hero,
        title: dto.destinationLabel
          ? `${label} en ${dto.destinationLabel}`
          : `${label} del Oriente Maya`,
        subtitle: `Selección editorial de ${label.toLowerCase()} en ${scope}.`,
      },
      emptyMessage: `Aún no hay ${label.toLowerCase()} publicados en ${scope}.`,
    };
  });

/**
 * Resolución pública de una categoría empresarial del CMS para el listado
 * regional `/oriente-maya/categoria/:categoria`. No inventa categorías:
 * devuelve `null` cuando el slug no existe en `business_categories`.
 */
export const resolvePublicBusinessCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { categorySlug?: unknown } | undefined) => ({
    categorySlug:
      typeof data?.categorySlug === "string" && /^[a-z0-9][a-z0-9-]{0,199}$/.test(data.categorySlug)
        ? data.categorySlug
        : "",
  }))
  .handler(async ({ data }): Promise<{ slug: string; label: string } | null> => {
    if (!data.categorySlug) return null;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const sb = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: cat } = await sb
      .from("business_categories")
      .select("slug, name")
      .ilike("slug", data.categorySlug)
      .maybeSingle();
    if (!cat) return null;
    return { slug: String(cat.slug).toLowerCase(), label: cat.name as string };
  });
