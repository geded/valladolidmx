import { TaxiPickupZonesCard } from "@/components/taxi/TaxiPickupZonesCard";
import { TaxiFleetCard } from "@/components/taxi/TaxiFleetCard";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CarFront,
  Check,
  Clipboard,
  Link2,
  ListFilter,
  Send,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  approveTaxiDriverInvitation,
  createTaxiDriverInvitation,
  getTaxiAdminDashboard,
  rejectTaxiDriverInvitation,
  setTaxiDriverApproval,
  saveTaxiAdminSettings,
  setTaxiDriverVehicleClass,
} from "@/lib/taxi/taxi.functions";
import {
  DEFAULT_TAXI_SETTINGS,
  formatTaxiDate,
  formatTaxiMoney,
  TAXI_STATUS_LABELS,
  taxiErrorMessage,
  buildTaxiLedger,
  buildTaxiStats,
  taxiLedgerCsv,
  type TaxiDriverInvitation,
  type TaxiSettings,
} from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/taxi-alux")({
  head: () => ({
    meta: [
      { title: "Taxi Alux · Administración · Valladolid.mx" },
      { name: "description", content: "Activa el servicio, invita conductores, configura tarifas y revisa los viajes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TaxiAdminPage,
});

type Tab = "resumen" | "solicitudes" | "conductores" | "viajes" | "movimientos" | "tarifas";

const tabs: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "conductores", label: "Conductores" },
  { id: "viajes", label: "Viajes" },
  { id: "movimientos", label: "Estadísticas y pagos" },
  { id: "tarifas", label: "Tarifas" },
];

function TaxiAdminPage() {
  const queryClient = useQueryClient();
  const dashboardFn = useServerFn(getTaxiAdminDashboard);
  const saveFn = useServerFn(saveTaxiAdminSettings);
  const reviewFn = useServerFn(setTaxiDriverApproval);
  const createInvitationFn = useServerFn(createTaxiDriverInvitation);
  const approveInvitationFn = useServerFn(approveTaxiDriverInvitation);
  const rejectInvitationFn = useServerFn(rejectTaxiDriverInvitation);
  const vehicleClassFn = useServerFn(setTaxiDriverVehicleClass);
  const [tab, setTab] = useState<Tab>("resumen");
  const [settings, setSettings] = useState<TaxiSettings>(DEFAULT_TAXI_SETTINGS);
  const [loadedSettings, setLoadedSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<TaxiDriverInvitation | null>(null);

  const dashboardQ = useQuery({
    queryKey: ["taxi", "admin"],
    queryFn: () => dashboardFn(),
    refetchInterval: 15_000,
  });
  const dashboard = dashboardQ.data;
  useEffect(() => {
    if (dashboard && !loadedSettings) {
      setSettings(dashboard.config);
      setLoadedSettings(true);
    }
  }, [dashboard, loadedSettings]);

  const drivers = dashboard?.drivers ?? [];
  const invitations = dashboard?.invitations ?? [];
  const rides = dashboard?.rides ?? [];
  const submitted = invitations.filter((invitation) => invitation.status === "submitted");
  const pending = invitations.filter((invitation) => invitation.status === "pending");
  const activeRides = rides.filter((ride) => !["completed", "cancelled"].includes(ride.status));
  const completedRides = rides.filter((ride) => ride.status === "completed");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["taxi"] });
  }

  async function saveSettings() {
    setBusy(true);
    try {
      await saveFn({
        data: {
          enabled: settings.enabled,
          baseFareCents: settings.base_fare_cents,
          perKmCents: settings.per_km_cents,
          perMinuteCents: settings.per_minute_cents,
          minimumFareCents: settings.minimum_fare_cents,
          nightSurchargeBps: settings.night_surcharge_bps,
        },
      });
      toast.success(settings.enabled ? "Taxi Alux está activado." : "Configuración guardada. El servicio sigue apagado.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function changeDriverClass(driverId: string, vehicleClass: "compacto" | "camioneta" | "van") {
    setBusy(true);
    try {
      await vehicleClassFn({ data: { driverId, vehicleClass } });
      toast.success("Tipo de vehículo actualizado.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function createLink() {
    setBusy(true);
    try {
      const invitation = await createInvitationFn({
        data: { invitedName: inviteName || undefined, invitedEmail: inviteEmail || undefined },
      });
      setCreatedInvitation(invitation);
      setInviteName("");
      setInviteEmail("");
      toast.success("Enlace privado creado. Cópialo y envíaselo al taxista.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation(invitation: TaxiDriverInvitation) {
    const url = `${window.location.origin}/registro-taxista/${invitation.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado.");
    } catch {
      window.prompt("Copia este enlace y envíaselo al taxista:", url);
    }
  }

  function shareInvitation(invitation: TaxiDriverInvitation) {
    const url = `${window.location.origin}/registro-taxista/${invitation.token}`;
    const text = `Hola${invitation.invited_name ? ` ${invitation.invited_name}` : ""}, Valladolid.mx te invita a solicitar tu acceso a Taxi Alux. Llena tus datos y los de tu vehículo aquí: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function approve(invitation: TaxiDriverInvitation) {
    if (!window.confirm(`¿Aprobar a ${invitation.full_name ?? "este taxista"} y enviar el acceso a su correo?`)) return;
    setBusy(true);
    try {
      const result = await approveInvitationFn({ data: { invitationId: invitation.id } });
      toast.success(
        result.existing
          ? "Taxista aprobado. Ya tenía cuenta y puede entrar a su panel."
          : "Taxista aprobado. Recibirá un correo para crear su contraseña.",
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function reject(invitation: TaxiDriverInvitation) {
    if (!window.confirm("¿Rechazar esta solicitud? El enlace dejará de poder utilizarse.")) return;
    setBusy(true);
    try {
      await rejectInvitationFn({ data: { invitationId: invitation.id } });
      toast.success("Solicitud rechazada.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDriver(driverId: string, approved: boolean) {
    setBusy(true);
    try {
      await reviewFn({ data: { driverId, approved } });
      toast.success(approved ? "Conductor aprobado." : "Conductor desactivado; ya no puede recibir viajes.");
      await refresh();
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl pb-16">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Administración · Transporte turístico</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Taxi Alux</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Invita conductores, controla disponibilidad y tarifas, y sigue los viajes en una sola pantalla.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">Servicio {settings.enabled ? "activado" : "desactivado"}</p>
              <p className="text-[11px] text-muted-foreground">Guarda en Tarifas para aplicar el cambio</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} aria-label="Activar Taxi Alux" />
          </div>
        </div>
      </header>

      <nav aria-label="Secciones de Taxi Alux" className="mt-5 grid grid-cols-2 gap-2 pb-1 min-[430px]:grid-cols-3 sm:flex sm:flex-wrap">
        {tabs.map((item) => (
          <Button key={item.id} type="button" size="sm" className="h-11 w-full justify-center sm:h-9 sm:w-auto" variant={tab === item.id ? "default" : "outline"} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === "solicitudes" && submitted.length ? <Badge className="ml-2">{submitted.length}</Badge> : null}
          </Button>
        ))}
      </nav>

      {dashboardQ.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Cargando administración…</p> : null}
      {dashboardQ.error ? (
        <p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{taxiErrorMessage(dashboardQ.error.message)}</p>
      ) : null}

      {dashboard && tab === "resumen" ? (
        <div className="mt-5 space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Taxistas disponibles" value={dashboard.config.available_drivers} icon={<CarFront className="size-5" />} />
            <Stat label="Solicitudes por revisar" value={submitted.length} icon={<UserCheck className="size-5" />} />
            <Stat label="Viajes en proceso" value={activeRides.length} icon={<ListFilter className="size-5" />} />
            <Stat label="Viajes realizados" value={completedRides.length} icon={<Check className="size-5" />} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Link2 className="size-5 text-primary" /> Invitar a un taxista</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Genera un enlace privado. El taxista llenará nombre, contacto, idiomas, sindicato,
                  licencia, seguro, marca y modelo, año, color, número económico y placas.
                </p>
              </div>
              <Badge variant="outline">Requiere tu aprobación</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="invite-name" className="text-xs font-medium">Nombre (opcional)</label>
                <Input id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label htmlFor="invite-email" className="text-xs font-medium">Correo esperado (opcional)</label>
                <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="El formulario sólo aceptará ese correo" className="mt-1" />
              </div>
            </div>
            <Button type="button" className="mt-4" disabled={busy} onClick={createLink}>
              <Link2 className="mr-2 size-4" /> Crear enlace de invitación
            </Button>
            {createdInvitation ? (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-sm font-medium">Enlace listo para enviar</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{`${window.location.origin}/registro-taxista/${createdInvitation.token}`}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => copyInvitation(createdInvitation)}><Clipboard className="mr-2 size-4" /> Copiar enlace</Button>
                  <Button type="button" size="sm" onClick={() => shareInvitation(createdInvitation)}><Send className="mr-2 size-4" /> Enviar por WhatsApp</Button>
                </div>
              </div>
            ) : null}
          </section>

          {pending.length ? (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <h2 className="text-sm font-semibold">Enlaces pendientes de llenar</h2>
              <div className="mt-3 space-y-3">
                {pending.slice(0, 8).map((invitation) => (
                  <div key={invitation.id} className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs">
                      <p className="font-medium">{invitation.invited_name || "Taxista por identificar"}</p>
                      <p className="mt-1 text-muted-foreground">{invitation.invited_email || "Correo libre"} · vence {formatTaxiDate(invitation.expires_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => copyInvitation(invitation)}>Copiar</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => shareInvitation(invitation)}>WhatsApp</Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!settings.enabled ? (
            <p className="rounded-xl bg-warning/10 p-4 text-sm text-warning-foreground">
              El servicio está apagado. Activa el interruptor de arriba y guarda en «Tarifas» cuando
              tengas al menos un conductor aprobado.
            </p>
          ) : null}
          <Button asChild variant="outline" size="sm"><Link to="/taxi">Ver página pública</Link></Button>
        </div>
      ) : null}

      {dashboard && tab === "solicitudes" ? (
        <section className="mt-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Solicitudes de taxistas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revisa los datos antes de crear el acceso y autorizar viajes.</p>
          </div>
          {submitted.length === 0 ? <p className="rounded-xl bg-secondary/60 p-5 text-sm text-muted-foreground">No hay solicitudes pendientes de revisión.</p> : null}
          {submitted.map((invitation) => (
            <article key={invitation.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{invitation.full_name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{invitation.email} · {invitation.phone}</p>
                </div>
                <Badge variant="outline">Enviada {formatTaxiDate(invitation.submitted_at)}</Badge>
              </div>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Idiomas" value={invitation.languages.join(", ")} />
                <Detail label="Inglés para turistas" value={invitation.english ? "Sí" : "No"} />
                <Detail label="Sindicato / sitio" value={invitation.union_name} />
                <Detail label="Licencia" value={invitation.license_number} />
                <Detail label="Seguro" value={invitation.insurance_reference} />
                <Detail label="Vehículo" value={invitation.vehicle_description} />
                <Detail label="Tipo" value={dashboard.config.fleet.classes.find((c) => c.key === (invitation.vehicle_class ?? "compacto"))?.label ?? "Compacto"} />
                <Detail label="Año / color" value={`${invitation.vehicle_year ?? "—"} · ${invitation.vehicle_color ?? "—"}`} />
                <Detail label="Número económico" value={invitation.vehicle_number} />
                <Detail label="Placas" value={invitation.plates} />
              </dl>
              {invitation.applicant_notes ? <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs">Notas: {invitation.applicant_notes}</p> : null}
              {!invitation.english ? <p className="mt-4 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">No marcó inglés, requisito solicitado para aprobar el servicio turístico.</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" disabled={busy || !invitation.english} onClick={() => approve(invitation)}><UserCheck className="mr-2 size-4" /> Aprobar y enviar acceso</Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => reject(invitation)}><X className="mr-2 size-4" /> Rechazar</Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {dashboard && tab === "conductores" ? (
        <section className="mt-5 space-y-4">
          <h2 className="text-lg font-semibold">Conductores registrados</h2>
          {drivers.length === 0 ? <p className="rounded-xl bg-secondary/60 p-5 text-sm text-muted-foreground">Aún no hay conductores aprobados. Crea una invitación desde Resumen.</p> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {drivers.map((driver) => (
              <article key={driver.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{driver.display_name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{driver.email} · {driver.phone ?? "Sin teléfono"}</p>
                  </div>
                  <Badge variant={driver.approved ? "default" : "outline"}>{driver.approved ? "Aprobado" : "Inactivo"}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>{driver.vehicle_description} · {driver.vehicle_color ?? "Color no indicado"} · {driver.plates}</p>
                  <p>{driver.union_name ?? "Sindicato no indicado"} · Número {driver.vehicle_number ?? "—"}</p>
                  <p>Idiomas: {driver.languages.join(", ")}</p>
                  <label className="flex items-center gap-2 pt-1">
                    <span className="font-medium text-foreground">Tipo de vehículo</span>
                    <select value={driver.vehicle_class ?? "compacto"} disabled={busy} onChange={(e) => void changeDriverClass(driver.id, e.target.value as "compacto" | "camioneta" | "van")} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                      {dashboard.config.fleet.classes.map((c) => <option key={c.key} value={c.key}>{c.label} · {c.seats}</option>)}
                    </select>
                  </label>
                  <p>{driver.is_available ? "Disponible ahora" : "No disponible"} · ubicación {formatTaxiDate(driver.location_updated_at)}</p>
                </div>
                <Button type="button" size="sm" variant={driver.approved ? "outline" : "default"} className="mt-4" disabled={busy} onClick={() => toggleDriver(driver.id, !driver.approved)}>
                  {driver.approved ? "Desactivar conductor" : "Aprobar conductor"}
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {dashboard && tab === "viajes" ? (
        <section className="mt-5 space-y-5">
          <RideList title="En proceso" rides={activeRides} empty="No hay viajes activos." />
          <RideList title="Realizados" rides={completedRides} empty="Todavía no hay viajes realizados." />
          <RideList title="Cancelados" rides={rides.filter((ride) => ride.status === "cancelled")} empty="No hay viajes cancelados." />
        </section>
      ) : null}

      {dashboard && tab === "movimientos" ? <MovementsPanel rides={rides} drivers={drivers} /> : null}

      {dashboard && tab === "tarifas" ? (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="size-5 text-primary" /> Tarifas y disponibilidad</h2>
          <p className="mt-1 text-sm text-muted-foreground">Importes en pesos mexicanos. El servidor calcula cada cotización; el navegador no decide el precio.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MoneyField id="base-fare" label="Tarifa base" value={settings.base_fare_cents} onChange={(value) => setSettings((current) => ({ ...current, base_fare_cents: value }))} />
            <MoneyField id="km-fare" label="Por kilómetro estimado" value={settings.per_km_cents} onChange={(value) => setSettings((current) => ({ ...current, per_km_cents: value }))} />
            <MoneyField id="minute-fare" label="Por minuto estimado" value={settings.per_minute_cents} onChange={(value) => setSettings((current) => ({ ...current, per_minute_cents: value }))} />
            <MoneyField id="minimum-fare" label="Tarifa mínima" value={settings.minimum_fare_cents} onChange={(value) => setSettings((current) => ({ ...current, minimum_fare_cents: value }))} />
            <div>
              <label htmlFor="night-rate" className="text-xs font-medium">Recargo nocturno (%)</label>
              <Input id="night-rate" type="number" min={0} max={100} step={1} value={settings.night_surcharge_bps / 100} onChange={(e) => setSettings((current) => ({ ...current, night_surcharge_bps: Math.round(Number(e.target.value) * 100) }))} className="mt-1" />
              <p className="mt-1 text-[11px] text-muted-foreground">De 20:00 a 06:00, hora local.</p>
            </div>
            <div>
              <label htmlFor="taxi-currency" className="text-xs font-medium">Moneda</label>
              <Input id="taxi-currency" value={settings.currency} onChange={(e) => setSettings((current) => ({ ...current, currency: e.target.value.toUpperCase().slice(0, 3) }))} className="mt-1" />
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Permitir solicitudes de viajeros</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Aunque esté activado, no se puede pedir si no hay al menos un taxista aprobado y disponible.</p>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} aria-label="Permitir solicitudes" />
            </div>
          </div>
          <Button type="button" className="mt-5" disabled={busy} onClick={saveSettings}>Guardar configuración</Button>
        </section>
      ) : null}
      {dashboard && tab === "tarifas" ? <TaxiFleetCard initial={dashboard.config.fleet} /> : null}
      {tab === "tarifas" ? (
        <TaxiPickupZonesCard />
      ) : null}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between text-primary">{icon}<span className="text-3xl font-semibold">{value}</span></div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value || "No indicado"}</dd></div>;
}

function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (cents: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
        <Input id={id} type="number" min={0} step={1} value={value / 100} onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))} className="pl-7" />
      </div>
    </div>
  );
}

function RideList({ title, rides, empty }: { title: string; rides: import("@/lib/taxi/rules").TaxiRide[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className="text-lg font-semibold">{title} <span className="text-sm font-normal text-muted-foreground">({rides.length})</span></h2>
      {rides.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{empty}</p> : null}
      <div className="mt-3 space-y-3">
        {rides.map((ride) => (
          <article key={ride.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{ride.folio}</p>
                <p className="mt-1 text-sm font-medium">{ride.origin_label} → {ride.destination_label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ride.traveler_name} · {formatTaxiDate(ride.requested_for)}</p>
                <p className="mt-1 text-xs">{TAXI_STATUS_LABELS[ride.status]}</p>
              </div>
              <Badge variant="outline">{formatTaxiMoney(ride.fare_amount, ride.currency)}{ride.cash_paid ? " · pagado" : " · efectivo"}</Badge>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MovementsPanel({ rides, drivers }: { rides: import("@/lib/taxi/rules").TaxiRide[]; drivers: import("@/lib/taxi/rules").TaxiDriver[] }) {
  const stats = buildTaxiStats(rides, drivers);
  const ledger = buildTaxiLedger(rides, drivers);
  function exportCsv() {
    const blob = new Blob(["\ufeff" + taxiLedgerCsv(ledger)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxi-alux-pagos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="mt-5 space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat label="Efectivo cobrado por conductores" value={formatTaxiMoney(stats.cashTotal)} />
        <BigStat label="Viajes realizados / cancelados" value={`${stats.completed} / ${stats.cancelled}`} />
        <BigStat label="Tasa de atención" value={`${stats.completionRate}%`} />
        <BigStat label="Km recorridos · min promedio" value={`${stats.totalKm} km · ${stats.avgMinutes} min`} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <h2 className="text-lg font-semibold">Por conductor</h2>
        {stats.byDriver.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Aún no hay viajes pagados.</p> : null}
        <div className="mt-3 divide-y divide-border text-sm">
          {stats.byDriver.map((row) => (
            <div key={row.driver_id} className="flex items-center justify-between py-2">
              <span>{row.driver_name}</span>
              <span className="text-muted-foreground">{row.rides} viajes · {formatTaxiMoney(row.cash)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Movimientos pagados</h2>
            <p className="mt-1 text-xs text-muted-foreground">Por ahora cada viaje se paga en efectivo directo al conductor; aquí queda el registro de cada cobro.</p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={ledger.length === 0} onClick={exportCsv}>Descargar Excel (CSV)</Button>
        </div>
        {ledger.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Todavía no hay pagos registrados.</p> : null}
        <ul className="mt-3 space-y-2 md:hidden">
          {ledger.map((e) => (
            <li key={e.ride_id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-medium">{e.folio}</p><p className="text-xs text-muted-foreground">{formatTaxiDate(e.paid_at)}</p></div>
                <p className="shrink-0 font-semibold text-primary">{formatTaxiMoney(e.amount, e.currency)}</p>
              </div>
              <p className="mt-2 break-words text-xs">{e.route} · {e.distance_km.toFixed(1)} km</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.driver_name} · {e.vehicle}</p>
              <p className="text-xs text-muted-foreground">{e.traveler_name} · {e.traveler_phone} · {e.method}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr><th className="py-2">Fecha</th><th>Folio</th><th>Conductor</th><th>Viajero</th><th>Ruta</th><th className="text-right">Km</th><th className="text-right">Importe</th><th>Forma de pago</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.map((e) => (
                <tr key={e.ride_id}>
                  <td className="py-2">{formatTaxiDate(e.paid_at)}</td>
                  <td>{e.folio}</td>
                  <td>{e.driver_name}<br /><span className="text-muted-foreground">{e.vehicle}</span></td>
                  <td>{e.traveler_name}<br /><span className="text-muted-foreground">{e.traveler_phone}</span></td>
                  <td>{e.route}</td>
                  <td className="text-right">{e.distance_km.toFixed(1)}</td>
                  <td className="text-right font-medium">{formatTaxiMoney(e.amount, e.currency)}</td>
                  <td>{e.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
