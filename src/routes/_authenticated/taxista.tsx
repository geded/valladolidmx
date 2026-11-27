import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, Check, MapPin, MessageCircle, Navigation, Phone, Power, ShieldCheck, Star, UserRound } from "lucide-react";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { TaxiAppInstallCard } from "@/components/taxi/TaxiAppInstallCard";
import { TaxiRideMap } from "@/components/taxi/TaxiRideMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptDriverRide,
  getMyTaxiDriver,
  getTaxiRideTracking,
  listDriverOpenRides,
  listDriverTaxiRides,
  rateTaxiRide,
  setDriverAvailability,
  setDriverRideStatus,
  updateDriverLocation,
} from "@/lib/taxi/taxi.functions";
import {
  formatTaxiDate,
  formatTaxiMoney,
  taxiTripLabel,
  driverDaySummary,
  isTaxiRideActive,
  localDay,
  nextDriverRideStatus,
  TAXI_STATUS_LABELS,
  taxiErrorMessage,
  taxiEtaMinutes,
  type TaxiOpenRide,
  type TaxiRide,
} from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/taxista")({
  head: () => ({
    meta: [
      { title: "Panel del conductor · Taxi Alux" },
      { name: "description", content: "Acepta solicitudes, comparte tu ubicación y gestiona tus viajes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TaxiDriverPage,
});

function TaxiDriverPage() {
  return (
    <WorkspaceProvider initialWorkspaceId="taxista">
      <WorkspaceShell title="Taxi Alux · Conductor">
        <DriverDashboard />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

function DriverDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const driverFn = useServerFn(getMyTaxiDriver);
  const ridesFn = useServerFn(listDriverTaxiRides);
  const openFn = useServerFn(listDriverOpenRides);
  const availableFn = useServerFn(setDriverAvailability);
  const acceptFn = useServerFn(acceptDriverRide);
  const statusFn = useServerFn(setDriverRideStatus);
  const locationFn = useServerFn(updateDriverLocation);
  const trackingFn = useServerFn(getTaxiRideTracking);
  const rateFn = useServerFn(rateTaxiRide);
  const [busy, setBusy] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const lastLocationSent = useRef(0);

  const driverQ = useQuery({
    queryKey: ["taxi", "driver", user?.id],
    queryFn: () => driverFn(),
    refetchInterval: 15_000,
  });
  const driver = driverQ.data;
  const ridesQ = useQuery({
    queryKey: ["taxi", "driver-rides", user?.id],
    queryFn: () => ridesFn(),
    enabled: Boolean(driver?.approved),
    refetchInterval: 10_000,
  });
  const openQ = useQuery({
    queryKey: ["taxi", "driver-open", user?.id],
    queryFn: () => openFn(),
    enabled: Boolean(driver?.approved && driver.is_available),
    refetchInterval: 8_000,
  });
  const rides = useMemo(() => ridesQ.data ?? [], [ridesQ.data]);
  const activeRide = rides.find((ride) => isTaxiRideActive(ride.status) && ride.status !== "requested") ?? null;
  const trackingQ = useQuery({
    queryKey: ["taxi", "driver-tracking", activeRide?.id],
    queryFn: () => trackingFn({ data: { rideId: activeRide!.id } }),
    enabled: Boolean(activeRide),
    refetchInterval: 10_000,
  });

  // Aviso sonoro y vibración cuando entra una solicitud nueva.
  const seenOpen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = (openQ.data ?? []).map((ride) => ride.id);
    if (seenOpen.current === null) {
      if (openQ.data) seenOpen.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seenOpen.current!.has(id));
    ids.forEach((id) => seenOpen.current!.add(id));
    if (fresh.length === 0) return;
    try {
      navigator.vibrate?.([300, 150, 300]);
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        [0, 0.35].forEach((t) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.3);
        });
      }
    } catch {
      /* el navegador puede bloquear el sonido hasta tocar la pantalla */
    }
    toast.success("Nueva solicitud de taxi disponible.");
  }, [openQ.data]);
  const today = driverDaySummary(rides, localDay(new Date().toISOString()));
  const driverState = activeRide ? "ocupado" : driver?.is_available ? "libre" : "desconectado";

  useEffect(() => {
    if (!driver?.approved || (!driver.is_available && !activeRide) || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - lastLocationSent.current < 15_000) return;
        lastLocationSent.current = Date.now();
        void locationFn({
          data: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
          .then(() => setLocationNote("Ubicación actualizada"))
          .catch(() => setLocationNote("No pudimos actualizar tu ubicación"));
      },
      () => setLocationNote("Autoriza tu ubicación para que el viajero pueda seguir el taxi."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [driver?.approved, driver?.is_available, activeRide, locationFn]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["taxi"] });
  }

  async function toggleAvailability(available: boolean) {
    setBusy(true);
    try {
      await availableFn({ data: { available } });
      toast.success(available ? "Ya puedes recibir solicitudes." : "Dejaste de recibir solicitudes.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function accept(ride: TaxiOpenRide) {
    setBusy(true);
    try {
      await acceptFn({ data: { rideId: ride.id } });
      toast.success("Viaje aceptado. Ya puedes ver los datos de recogida.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  const [confirmPaid, setConfirmPaid] = useState(false);

  async function advance(ride: TaxiRide) {
    const next = nextDriverRideStatus(ride.status);
    if (!next) return;
    if (next === "completed" && !confirmPaid) {
      setConfirmPaid(true);
      return;
    }
    setBusy(true);
    try {
      await statusFn({ data: { rideId: ride.id, status: next } });
      toast.success(next === "completed" ? "Viaje realizado y pago en efectivo registrado." : "Estado actualizado.");
      setConfirmPaid(false);
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  if (driverQ.isLoading) return <p className="text-sm text-muted-foreground">Cargando tu panel…</p>;
  if (!driver) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="mt-3 text-2xl font-semibold">Tu cuenta aún no es de taxista</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pide al administrador de Valladolid.mx un enlace de registro. Después de llenar tus datos
          y recibir aprobación, este panel te permitirá aceptar viajes.
        </p>
        <Button asChild variant="outline" className="mt-4"><Link to="/taxi">Conocer Taxi Alux</Link></Button>
      </section>
    );
  }
  if (!driver.approved) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="mt-3 text-2xl font-semibold">Tu solicitud está en revisión</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          El administrador debe validar tus datos y tu vehículo antes de que puedas recibir viajes.
        </p>
      </section>
    );
  }

  const next = activeRide ? nextDriverRideStatus(activeRide.status) : null;
  const toPickup = activeRide ? activeRide.status === "accepted" : false;
  const navTarget = activeRide
    ? toPickup
      ? { lat: activeRide.origin_lat, lng: activeRide.origin_lng }
      : { lat: activeRide.destination_lat, lng: activeRide.destination_lng }
    : null;
  const me = trackingQ.data?.lat != null && trackingQ.data.lng != null ? { lat: trackingQ.data.lat, lng: trackingQ.data.lng } : null;
  const driverEta = navTarget && activeRide && activeRide.status !== "arrived" ? taxiEtaMinutes(me, navTarget) : null;
  const travelerPhone = activeRide?.traveler_phone ? activeRide.traveler_phone.replace(/[^\d+]/g, "") : "";
  const toRate = rides.find((ride) => ride.status === "completed" && !ride.driver_rating && ride.completed_at && Date.now() - new Date(ride.completed_at).getTime() < 24 * 3600_000) ?? null;

  async function rateTraveler(ride: TaxiRide, rating: number) {
    try {
      await rateFn({ data: { rideId: ride.id, rating } });
      toast.success("Calificación guardada.");
      await queryClient.invalidateQueries({ queryKey: ["taxi"] });
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    }
  }
  const nextLabel = next === "arrived" ? "Llegué por el viajero" : next === "in_progress" ? "Iniciar viaje" : next === "completed" ? "Llegamos al destino · terminar viaje" : null;

  return (
    <div className="mx-auto max-w-6xl pb-14">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Taxi Alux · Conductor</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Hola, {driver.display_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {driver.vehicle_description}{driver.vehicle_color ? ` ${driver.vehicle_color}` : ""} · {driver.plates}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <Power className={`size-5 ${driver.is_available ? "text-success" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium">{driverState === "ocupado" ? "Ocupado · en servicio" : driverState === "libre" ? "Libre · recibo solicitudes" : "Desconectado"}</p>
              <p className="text-[11px] text-muted-foreground">Hoy: {today.rides} viajes · {formatTaxiMoney(today.cash)} en efectivo</p>
            </div>
            <Switch checked={driver.is_available} disabled={busy || Boolean(activeRide)} onCheckedChange={toggleAvailability} aria-label="Disponibilidad del taxista" />
          </div>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          {activeRide ? (
            <section className="rounded-2xl border border-primary/30 bg-card p-4 shadow-elevated sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{activeRide.folio}</p>
                  <h2 className="mt-1 text-xl font-semibold">{TAXI_STATUS_LABELS[activeRide.status]}</h2>
                  {driverEta != null ? (
                    <p className="text-sm text-primary">{toPickup ? `Llegas por el viajero en ~${driverEta} min` : `Destino en ~${driverEta} min`}</p>
                  ) : null}
                </div>
                <Badge>{formatTaxiMoney(activeRide.fare_amount, activeRide.currency)} · efectivo</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Recoger en</p>
                  <p className="mt-1 font-medium">{activeRide.origin_label}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="mt-1 font-medium">{activeRide.destination_label}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border p-3 text-sm">
                <p className="flex items-center gap-2"><UserRound className="size-4" /> {activeRide.traveler_name} · {activeRide.passengers} personas</p>
                <p className="mt-1 text-xs font-medium">{taxiTripLabel(activeRide)}</p>
                {activeRide.stops?.length ? <p className="mt-1 text-xs">Paradas: {activeRide.stops.map((s) => s.label).join(" · ")}</p> : null}
                {activeRide.trip_mode === "hourly" ? <p className="mt-1 text-xs text-muted-foreground">Espera al viajero y regrésalo a su punto de recogida.</p> : null}
                <p className="mt-1 text-muted-foreground">{activeRide.traveler_phone}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatTaxiDate(activeRide.requested_for)}</p>
                {activeRide.notes ? <p className="mt-2 text-xs">Notas: {activeRide.notes}</p> : null}
                {travelerPhone ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" className="h-11"><a href={`tel:${travelerPhone}`}><Phone className="mr-2 size-4" /> Llamar</a></Button>
                    <Button asChild variant="outline" className="h-11">
                      <a href={`https://wa.me/${travelerPhone.replace("+", "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-4" /> WhatsApp</a>
                    </Button>
                  </div>
                ) : null}
              </div>
              {navTarget ? (
                <Button asChild variant="secondary" className="mt-3 h-11 w-full">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer">
                    <Navigation className="mr-2 size-4" /> {toPickup ? "Navegar a la recogida" : "Navegar al destino"}
                  </a>
                </Button>
              ) : null}
              <div className="mt-4"><TaxiRideMap ride={activeRide} tracking={trackingQ.data} /></div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {locationNote ?? "Mantén este panel abierto durante el servicio para actualizar tu ubicación."}
              </p>
              {next === "completed" && confirmPaid ? (
                <div className="mt-4 rounded-xl border border-primary/40 bg-secondary/60 p-4 text-sm">
                  <p className="font-semibold">¿Terminar el viaje {activeRide.folio}?</p>
                  <p className="mt-1 text-muted-foreground">
                    Confirma que el viajero te pagó {formatTaxiMoney(activeRide.fare_amount, activeRide.currency)} en efectivo. Quedará registrado como pagado.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button type="button" disabled={busy} onClick={() => advance(activeRide)}>
                      <Check className="mr-2 size-4" /> Sí, recibí el pago · terminar
                    </Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmPaid(false)}>
                      Todavía no
                    </Button>
                  </div>
                </div>
              ) : next && nextLabel ? (
                <Button type="button" className="mt-4 h-12 w-full text-base" disabled={busy} onClick={() => advance(activeRide)}>
                  <Check className="mr-2 size-4" /> {nextLabel}
                </Button>
              ) : null}
            </section>
          ) : (
            <>
            {toRate ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <p className="text-sm font-semibold">Califica a {toRate.traveler_name} ({toRate.folio})</p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} estrellas`} className="p-1" onClick={() => rateTraveler(toRate, n)}>
                      <Star className="size-8 text-primary" />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Navigation className="size-5 text-primary" /> Solicitudes disponibles</h2>
              {!driver.is_available ? (
                <p className="mt-4 text-sm text-muted-foreground">Activa «Estoy disponible» para ver solicitudes.</p>
              ) : null}
              {driver.is_available && openQ.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Buscando solicitudes…</p> : null}
              {driver.is_available && (openQ.data ?? []).length === 0 && !openQ.isLoading ? (
                <p className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">No hay solicitudes esperando. La pantalla se actualiza sola.</p>
              ) : null}
              <div className="mt-4 space-y-3">
                {(openQ.data ?? []).map((ride) => (
                  <article key={ride.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{ride.origin_label} → {ride.destination_label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatTaxiDate(ride.requested_for)} · {ride.passengers} personas</p>
                        <p className="mt-1 text-xs font-medium">{taxiTripLabel(ride)}</p>
                        {ride.stops?.length ? <p className="mt-1 text-xs text-muted-foreground">Paradas: {ride.stops.map((s) => s.label).join(" · ")}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{ride.distance_km.toFixed(1)} km · {ride.estimated_minutes} min</p>
                      </div>
                      <Badge variant="outline">{formatTaxiMoney(ride.fare_amount, ride.currency)}</Badge>
                    </div>
                    <Button type="button" className="mt-3 h-12 w-full text-base" disabled={busy} onClick={() => accept(ride)}>Aceptar este viaje</Button>
                  </article>
                ))}
              </div>
            </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <TaxiAppInstallCard signedIn />
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-primary" /> Tus últimos viajes</h2>
            <div className="mt-3 space-y-3">
              {rides.filter((ride) => ride.id !== activeRide?.id).slice(0, 8).map((ride) => (
                <div key={ride.id} className="border-t border-border pt-3 text-xs">
                  <p className="font-medium">{ride.destination_label}</p>
                  <p className="mt-1 text-muted-foreground">{TAXI_STATUS_LABELS[ride.status]} · {formatTaxiMoney(ride.fare_amount, ride.currency)}</p>
                </div>
              ))}
              {rides.filter((ride) => ride.id !== activeRide?.id).length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay viajes terminados.</p> : null}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground shadow-soft">
            <CarFront className="mb-2 size-5 text-primary" />
            Recuerda: en esta etapa el viajero paga el total en efectivo. Al terminar, registra el
            cobro con el botón «Llegamos al destino · terminar viaje».
          </section>
        </aside>
      </div>
    </div>
  );
}
