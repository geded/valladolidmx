/**
 * Revisión visual interna del listado de casas de vacaciones.
 * Usa exactamente PremiumDiscoveryListingSurface, la misma autoridad que
 * Hoteles y Restaurantes. Los elementos son fixtures noindex y no se escriben.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { PremiumDiscoveryListingSurface } from "@/components/listing-premium/PremiumDiscoveryListingSurface";
import { listingCard } from "@/components/listing-premium/listing-premium-content";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const DTO: PublicListingDTO = {
  contractVersion: "1.0.0",
  family: "casas-de-vacaciones",
  label: "Casas de vacaciones",
  route: "/casas-de-vacaciones",
  source: "businesses",
  provenance: "real_reads",
  hero: {
    eyebrow: "Estancias completas · Valladolid y Oriente Maya",
    title: "Casas para vivir Valladolid y descubrir el territorio",
    subtitle: "Elige una casa para tu grupo y conviértela en punto de partida hacia cenotes, comunidades y pueblos del Oriente Maya.",
    metaLabel: "Valladolid",
  },
  destinationSlug: "valladolid",
  destinationLabel: "Valladolid",
  emptyMessage: "Aún no hay casas publicadas en este destino.",
  items: [
    listingCard({
      id: "preview-casa-patio-colonial",
      entityKind: "business",
      eyebrow: "Casa completa",
      name: "Casa de patio colonial",
      href: "/lovable/g8p2-vacation-rental-premium-preview",
      tagline: "Patio de piedra, cocina equipada y alberca privada para explorar Valladolid en grupo.",
      mediaUrl: `${GOVERNED}/hotel-cover.jpg`,
      mediaAlt: "Patio colonial con alberca en una casa de Valladolid",
      location: { label: "Centro Histórico · Valladolid", distanceKm: 0.8 },
      coordinates: { lat: 20.689, lng: -88.201 },
      highlights: ["Hasta 8 huéspedes", "3 recámaras", "Alberca privada"],
      filterAttributes: {
        property_type: "casa_completa",
        capacity: "8",
        bedrooms: "3",
        amenities: ["alberca", "cocina", "wifi"],
        stay_features: ["patio_privado", "centro_historico"],
        traveler_profile: ["familias", "grupos"],
        zone: "centro_historico",
      },
    }),
    listingCard({
      id: "preview-villa-sisal",
      entityKind: "business",
      eyebrow: "Villa",
      name: "Villa Sisal",
      href: "/lovable/g8p2-vacation-rental-premium-preview",
      tagline: "Una estancia tranquila con jardín y hamacas cerca de la Calzada de los Frailes.",
      mediaUrl: `${GOVERNED}/hotel-gallery-1.jpg`,
      mediaAlt: "Habitación de una villa colonial en Valladolid",
      location: { label: "Barrio de Sisal · Valladolid", distanceKm: 1.2 },
      coordinates: { lat: 20.6839, lng: -88.2057 },
      highlights: ["Hasta 6 huéspedes", "Jardín", "Cocina equipada"],
      filterAttributes: {
        property_type: "villa",
        capacity: "6",
        bedrooms: "2",
        amenities: ["cocina", "wifi", "estacionamiento"],
        stay_features: ["jardin", "estancia_larga"],
        traveler_profile: ["parejas", "familias"],
        zone: "sisal",
      },
    }),
    listingCard({
      id: "preview-casa-cenote",
      entityKind: "business",
      eyebrow: "Casa rural",
      name: "Casa del camino a los cenotes",
      href: "/lovable/g8p2-vacation-rental-premium-preview",
      tagline: "Espacio independiente para combinar descanso, naturaleza y recorridos cercanos.",
      mediaUrl: `${GOVERNED}/hotel-gallery-2.jpg`,
      mediaAlt: "Terraza de una casa vacacional cercana a Valladolid",
      location: { label: "Zona de cenotes · Valladolid", distanceKm: 7.5 },
      coordinates: { lat: 20.703, lng: -88.157 },
      highlights: ["Hasta 10 huéspedes", "4 recámaras", "Estacionamiento"],
      filterAttributes: {
        property_type: "casa_rural",
        capacity: "10",
        bedrooms: "4",
        amenities: ["cocina", "estacionamiento", "aire_acondicionado"],
        stay_features: ["naturaleza", "grupo_grande"],
        traveler_profile: ["grupos", "familias"],
        zone: "zona_de_cenotes",
      },
    }),
  ],
};

export const Route = createFileRoute("/lovable/g4-vacation-rental-listing-premium-preview")({
  head: () => ({
    meta: [
      { title: "Casas de vacaciones en Valladolid · Revisión visual" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: VacationRentalListingPremiumPreview,
});

function VacationRentalListingPremiumPreview() {
  return (
    <PublicShell variant="default">
      <PremiumDiscoveryListingSurface dto={DTO} presentation="editorial" />
    </PublicShell>
  );
}
