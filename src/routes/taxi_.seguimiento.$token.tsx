import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CarFront } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { TaxiRideMap } from "@/components/taxi/TaxiRideMap";
import { getSharedTaxiRide } from "@/lib/taxi/taxi.functions";
import { TAXI_STATUS_LABELS, taxiEtaHeadline, taxiEtaMinutes } from "@/lib/taxi/rules";

export const Route = createFileRoute("/taxi_/seguimiento/$token")({
  head: () => ({
    meta: [
      { title: "Viaje compartido · Taxi Alux · Valladolid.mx" },
      { name: "description", content: "Sigue en vivo un traslado de Taxi Alux que te compartieron." },
      { property: "og:title", content: "Viaje compartido · Taxi Alux" },
      { property: "og:description", content: "Sigue en vivo un traslado de Taxi Alux que te compartieron." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedRidePage,
});

function SharedRidePage() {
  const { token } = Route.useParams();
  const q = useQuery({
    queryKey: ["taxi", "shared", token],
    queryFn: () => getSharedTaxiRide({ data: { token } }),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  const ride = q.data;
  const driver = ride?.lat != null && ride.lng != null ? { lat: ride.lat, lng: ride.lng } : null;
  const eta = ride
    ? ride.status === "accepted"
      ? taxiEtaMinutes(driver, { lat: ride.origin_lat, lng: ride.origin_lng })
      : ride.status === "in_progress"
        ? taxiEtaMinutes(driver, { lat: ride.destination_lat, lng: ride.destination_lng })
        : null
    : null;
  return (
    <PublicShell crumbs={[{ label: "Inicio", to: "/" }, { label: "Viaje compartido" }]} compactCrumbsOnMobile className="pb-12 pt-5">
      <div className="mx-auto max-w-2xl">
        {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando viaje…</p> : null}
        {!q.isLoading && !ride ? (
          <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <CarFront className="mx-auto size-8 text-primary" />
            <h1 className="mt-3 text-lg font-semibold">Este enlace ya no está disponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">El viaje terminó hace tiempo o el enlace no es válido.</p>
          </section>
        ) : null}
        {ride ? (
          <section className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Taxi Alux · {ride.folio}</p>
              <h1 className="mt-1 text-2xl font-semibold">{taxiEtaHeadline(ride.status, eta).replace("Tu taxi", "El taxi").replace("Llegas", "Llega")}</h1>
              <p className="text-xs text-muted-foreground">{TAXI_STATUS_LABELS[ride.status]}</p>
            </div>
            <TaxiRideMap
              ride={ride}
              tracking={driver ? { driver_id: "", display_name: ride.driver_name ?? "Taxi", vehicle_description: "", plates: "", languages: [], english: false, lat: driver.lat, lng: driver.lng, location_updated_at: ride.location_updated_at, location_stale: false } : null}
            />
            <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
              <p><span className="text-muted-foreground">De:</span> {ride.origin_label}</p>
              <p className="mt-1"><span className="text-muted-foreground">A:</span> {ride.destination_label}</p>
              {ride.driver_name ? (
                <p className="mt-3 border-t border-border pt-3">
                  {ride.driver_name} · {ride.vehicle_description}{ride.vehicle_color ? ` ${ride.vehicle_color}` : ""} · <strong>{ride.plates}</strong>
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </PublicShell>
  );
}
