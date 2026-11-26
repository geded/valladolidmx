import { Link, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, ChevronRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isStandaloneDisplay } from "@/lib/navigation/session-context";
import { listMyTaxiRides } from "@/lib/taxi/taxi.functions";
import { formatTaxiMoney, isTaxiRideActive, TAXI_STATUS_LABELS } from "@/lib/taxi/rules";

/** Taxi Alux dentro del perfil y de Mi Viaje: viaje en curso o acceso para pedir uno. */
export function TaxiTripCard() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const listFn = useServerFn(listMyTaxiRides);
  const q = useQuery({
    queryKey: ["taxi", "traveler", user?.id],
    queryFn: () => listFn(),
    enabled: Boolean(user?.id),
    staleTime: 20_000,
  });
  const rides = q.data ?? [];
  const active = rides.find((r) => isTaxiRideActive(r.status));
  const installed = hydrated && isStandaloneDisplay();
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary"><CarFront className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Taxi Alux · Traslados turísticos</h2>
          {active ? (
            <p className="mt-1 text-sm">
              {active.folio} · <strong>{TAXI_STATUS_LABELS[active.status]}</strong> ·{" "}
              {formatTaxiMoney(active.fare_amount, active.currency)} en efectivo
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Conductores aprobados que hablan inglés, precio antes de pedir y pago en efectivo.
              {rides.length ? ` Llevas ${rides.length} traslado${rides.length === 1 ? "" : "s"}.` : ""}
            </p>
          )}
          {!installed ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Smartphone className="mt-0.5 size-3.5 shrink-0" />
              Instala la aplicación en tu celular para ver tu taxi en el mapa y recibir el aviso cuando llegue; sin ella solo recibirás correos.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={active ? "/cuenta/taxi" : "/taxi"}>
                {active ? "Seguir mi taxi" : "Pedir un taxi"} <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
            {rides.length && !active ? (
              <Button asChild size="sm" variant="outline"><Link to="/cuenta/taxi">Mis traslados</Link></Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
