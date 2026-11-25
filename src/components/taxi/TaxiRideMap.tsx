import { InteractiveMap } from "@/components/maps/InteractiveMap";
import type { TaxiOpenRide, TaxiTracking } from "@/lib/taxi/rules";

export function TaxiRideMap({
  ride,
  tracking,
}: {
  ride: TaxiOpenRide;
  tracking?: TaxiTracking | null;
}) {
  const points = [
    { lat: ride.origin_lat, lng: ride.origin_lng },
    { lat: ride.destination_lat, lng: ride.destination_lng },
  ];
  if (tracking?.lat != null && tracking.lng != null) {
    points.push({ lat: tracking.lat, lng: tracking.lng });
  }
  return (
    <div>
      <InteractiveMap
        lat={ride.origin_lat}
        lng={ride.origin_lng}
        zoom={13}
        className="h-[320px] w-full rounded-2xl border border-border bg-muted sm:h-[380px]"
        markers={[
          { lat: ride.origin_lat, lng: ride.origin_lng, title: "Origen", key: "origin" },
          {
            lat: ride.destination_lat,
            lng: ride.destination_lng,
            title: "Destino",
            key: "destination",
          },
          ...(tracking?.lat != null && tracking.lng != null
            ? [
                {
                  lat: tracking.lat,
                  lng: tracking.lng,
                  title: `Taxi de ${tracking.display_name}`,
                  key: "driver",
                  featured: true,
                },
              ]
            : []),
        ]}
        routeStops={[
          { lat: ride.origin_lat, lng: ride.origin_lng, key: "origin" },
          { lat: ride.destination_lat, lng: ride.destination_lng, key: "destination" },
        ]}
        connectByRoad
        fitPoints={points}
        routeEmphasis="prominent"
      />
      {tracking?.location_stale ? (
        <p className="mt-2 text-xs text-muted-foreground">
          La última ubicación del taxi tiene más de dos minutos. El conductor debe mantener su
          panel abierto para actualizarla.
        </p>
      ) : null}
    </div>
  );
}
