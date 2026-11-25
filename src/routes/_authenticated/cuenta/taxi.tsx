import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, ChevronRight, Clock3, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaxiAppInstallCard } from "@/components/taxi/TaxiAppInstallCard";
import { TaxiRideMap } from "@/components/taxi/TaxiRideMap";
import { useAuth } from "@/hooks/useAuth";
import { isStandaloneDisplay } from "@/lib/navigation/session-context";
import {
  cancelTaxiRide,
  getTaxiRideTracking,
  listMyTaxiRides,
} from "@/lib/taxi/taxi.functions";
import {
  canCancelTaxiRide,
  formatTaxiDate,
  formatTaxiMoney,
  isTaxiRideActive,
  TAXI_STATUS_LABELS,
  taxiErrorMessage,
  type TaxiRide,
} from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cuenta/taxi")({
  head: () => ({
    meta: [
      { title: "Mis viajes · Taxi Alux · Valladolid.mx" },
      { name: "description", content: "Sigue tus solicitudes y traslados de Taxi Alux." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TravelerTaxiPage,
});

function TravelerTaxiPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listMyTaxiRides);
  const trackingFn = useServerFn(getTaxiRideTracking);
  const cancelFn = useServerFn(cancelTaxiRide);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setInstalled(isStandaloneDisplay()), []);

  const ridesQ = useQuery({
    queryKey: ["taxi", "traveler", user?.id],
    queryFn: () => listFn(),
    refetchInterval: 10_000,
  });
  const rides = useMemo(() => ridesQ.data ?? [], [ridesQ.data]);
  const active = rides.find((ride) => isTaxiRideActive(ride.status));
  const selected = rides.find((ride) => ride.id === selectedId) ?? active ?? rides[0] ?? null;
  const trackingQ = useQuery({
    queryKey: ["taxi", "tracking", selected?.id, selected?.driver_id],
    queryFn: () => trackingFn({ data: { rideId: selected!.id } }),
    enabled: Boolean(selected?.driver_id),
    refetchInterval: 8_000,
  });

  async function cancel(ride: TaxiRide) {
    if (!window.confirm("¿Cancelar esta solicitud de taxi?")) return;
    setBusy(true);
    try {
      await cancelFn({ data: { rideId: ride.id } });
      toast.success("Tu solicitud fue cancelada.");
      await queryClient.invalidateQueries({ queryKey: ["taxi", "traveler", user?.id] });
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-14">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Taxi Alux</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Mis traslados</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revisa tu conductor, el estado del viaje y el importe en efectivo.
          </p>
        </div>
        <Button asChild>
          <Link to="/taxi"><Plus className="mr-2 size-4" /> Pedir un taxi</Link>
        </Button>
      </header>

      {ridesQ.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Cargando tus traslados…</p> : null}
      {ridesQ.error ? (
        <p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {taxiErrorMessage(ridesQ.error.message)}
        </p>
      ) : null}

      {!ridesQ.isLoading && rides.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <CarFront className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Todavía no has pedido un taxi</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cotiza tu primer traslado por el Oriente Maya.</p>
          <Button asChild className="mt-4"><Link to="/taxi">Cotizar un traslado</Link></Button>
        </section>
      ) : null}

      {selected ? (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{selected.folio}</p>
                <h2 className="mt-1 text-xl font-semibold">{TAXI_STATUS_LABELS[selected.status]}</h2>
              </div>
              <Badge variant="outline">{formatTaxiMoney(selected.fare_amount, selected.currency)} · efectivo</Badge>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="mt-1 font-medium">{selected.origin_label}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Destino</p>
                <p className="mt-1 font-medium">{selected.destination_label}</p>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-4" /> {formatTaxiDate(selected.requested_for)}
              </p>
              <p className="text-xs text-muted-foreground">
                {selected.distance_km.toFixed(1)} km · {selected.estimated_minutes} min · {selected.passengers} personas
              </p>
            </div>

            {trackingQ.data ? (
              <div className="mt-5 rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Tu conductor</p>
                <p className="mt-1 font-semibold">{trackingQ.data.display_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trackingQ.data.vehicle_description} · {trackingQ.data.plates}
                </p>
                <p className="mt-1 text-xs">Idiomas: {trackingQ.data.languages.join(", ")}</p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-primary/10 p-4 text-sm">
                Estamos esperando que un taxista disponible acepte tu solicitud.
              </p>
            )}

            {isTaxiRideActive(selected.status) && installed ? (
              <div className="mt-5">
                <TaxiRideMap ride={selected} tracking={trackingQ.data} />
              </div>
            ) : null}
            {isTaxiRideActive(selected.status) && !installed ? (
              <p className="mt-5 rounded-xl bg-warning/10 p-4 text-xs leading-5 text-warning-foreground">
                Instala la aplicación para ver el seguimiento en vivo y recibir alertas. En este
                navegador sólo puedes consultar el estado; los avisos también llegan por correo.
              </p>
            ) : null}
            {selected.status === "completed" ? (
              <p className="mt-5 rounded-xl bg-success/10 p-4 text-sm text-success">
                Viaje terminado. {selected.cash_paid ? "Pago en efectivo registrado por el conductor." : ""}
              </p>
            ) : null}
            {canCancelTaxiRide(selected.status) ? (
              <Button type="button" variant="outline" className="mt-5" disabled={busy} onClick={() => cancel(selected)}>
                <XCircle className="mr-2 size-4" /> Cancelar solicitud
              </Button>
            ) : null}
          </section>

          <aside className="space-y-4">
            <TaxiAppInstallCard signedIn />
            {rides.length > 1 ? (
              <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Otros traslados</h2>
                <div className="mt-2 space-y-1">
                  {rides.filter((ride) => ride.id !== selected.id).slice(0, 10).map((ride) => (
                    <button
                      type="button"
                      key={ride.id}
                      onClick={() => setSelectedId(ride.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-muted"
                    >
                      <span>
                        <span className="block text-xs font-medium">{ride.destination_label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{TAXI_STATUS_LABELS[ride.status]}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
