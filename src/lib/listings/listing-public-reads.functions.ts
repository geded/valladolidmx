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
      const [businesses, taxonomy] = await Promise.all([
        listMarketplaceBusinesses().catch(() => []),
        getListingFamilyTaxonomy().catch(() => ({})),
      ]);
      return buildPublicListing({
        family: contract.id,
        destino: data.destino,
        businesses,
        categorySlugs: taxonomy[contract.id],
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
