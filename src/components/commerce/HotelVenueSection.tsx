/**
 * Restaurante del hotel · bloque público.
 *
 * Se muestra en la ficha de un negocio anfitrión (hotel) cuando el equipo
 * vinculó los negocios que están dentro de él. Reutiliza la Tourism Card
 * oficial: si no hay vínculos publicados no dibuja nada y la plantilla queda
 * exactamente igual.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TourismCard,
  type TourismCardVM,
} from "@/components/experience-builder/tourism-card/TourismCard";
import {
  venueActionLabel,
  venueBookingHref,
  venueCategoryLabel,
  venuePlaceLabel,
  type PublicVenue,
} from "@/lib/commerce/hotel-venue";

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);

function toVM(venue: PublicVenue): TourismCardVM {
  return {
    id: `business:${venue.id}`,
    entityKind: "business",
    eyebrow: venueCategoryLabel(venue.category_slug) || null,
    name: venue.name,
    href: venueBookingHref(venue),
    tagline: venue.tagline || null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: venue.name,
    rating: null,
    location: venue.destination_slug ? { label: venuePlaceLabel(venue.destination_slug), distanceKm: null } : null,
    territorialContext: null,
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: null,
    priceHint: null,
    primaryAction: { label: venueActionLabel(venue), href: venueBookingHref(venue) },
    secondaryAction: null,
  };
}

export function HotelVenueSection({ businessId }: { businessId: string }) {
  const venues = useQuery({
    queryKey: ["hotel-venue-section", businessId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await rpc("business_public_venues", { _business_id: businessId });
      if (error) return [] as PublicVenue[];
      return Array.isArray(data) ? (data as PublicVenue[]) : [];
    },
  });

  const list = (venues.data ?? []).slice(0, 6);
  if (!list.length) return null;

  return (
    <section id="restaurante-del-hotel" data-eb-anchor className="mt-8 scroll-mt-24 sm:mt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {list.length === 1 ? "Restaurante del hotel" : "Restaurantes del hotel"}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {list.map((venue) => (
          <TourismCard
            key={venue.link_id}
            vm={toVM(venue)}
            capabilities={{
              showMedia: false,
              showGallery: false,
              showRating: false,
              showPrice: false,
              showDate: false,
              showAvailability: false,
              showDistance: false,
              showFavorite: false,
            }}
          />
        ))}
      </div>
    </section>
  );
}
