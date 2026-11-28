import { portalErrorMessage } from "@/lib/portal/error-messages";
/**
 * /portal/reservaciones-mesa — Agenda de mesas del restaurante (Etapas 1 y 2: agenda, plano, lista de espera, ficha y reportes).
 * Pensada para el teléfono: agenda del día con estados, alta por teléfono o
 * sin reservación, cerrar el día y ajustes de mesas y horarios.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  createStaffTableReservation,
  getTableBookingPortal,
  saveTableBookingSettings,
  setTableDayClosed,
  updateTableReservation,
} from "@/lib/commerce/table-booking.functions";
import {
  TABLE_SOURCE_LABEL,
  TABLE_STATUS_LABEL,
  WEEKDAYS,
  formatTableDate,
  formatTableTime,
  meridaToday,
  nextTableActions,
  normalizeTableSettings,
  occupiesTable,
  platformGuests,
  tableBookingError,
  type TableBookingSettings,
  type TableStatus,
} from "@/lib/commerce/table-booking";
import { ShareTableBookingCard } from "@/components/commerce/ShareTableBookingCard";
import { CashierPinCard } from "@/components/commerce/CashierPinCard";
import { FloorPlanView, GuestProfileCard, TableReportsView, WaitlistView } from "@/components/commerce/TableFloorTools";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/reservaciones-mesa")({
  head: () => ({ meta: [{ title: "Reservaciones de mesa · Portal Valladolid.mx" }, { name: "description", content: "Administra reservas, horarios y mesas de tu restaurante en Valladolid.mx." }, { property: "og:title", content: "Reservaciones de mesa · Portal Valladolid.mx" }, { property: "og:description", content: "Administra reservas, horarios y mesas de tu restaurante en Valladolid.mx." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: TableReservationsPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(window.localStorage.getItem(STORAGE_KEY));
    const on = (e: Event) => setId((e as CustomEvent<string>).detail ?? null);
    window.addEventListener("portal:active-business-changed", on);
    return () => window.removeEventListener("portal:active-business-changed", on);
  }, []);
  return id;
}

function shiftDay(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function TableReservationsPage() {
  const businessId = useActiveBusinessId();
  const [date, setDate] = useState("");
  const [tab, setTab] = useState<"agenda" | "plano" | "espera" | "reportes" | "ajustes">("agenda");
  useEffect(() => setDate(meridaToday()), []);
  const fetchFn = useServerFn(getTableBookingPortal);
  const q = useQuery({
    queryKey: ["portal", "table-booking", businessId, date],
    enabled: Boolean(businessId && date),
    queryFn: () => fetchFn({ data: { businessId: businessId as string, date } }),
    refetchInterval: 60_000,
  });

  if (!businessId) return <p className="p-6 text-sm text-muted-foreground">Elige tu empresa en el menú del Portal.</p>;
  if (q.isLoading || !q.data) return <p className="p-6 text-sm text-muted-foreground">Cargando agenda…</p>;
  const d = q.data;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reservaciones de mesa</p>
        <h1 className="mt-1 text-2xl">Agenda del restaurante</h1>
        {!d.activated ? (
          <p className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Aún no está activado «Reservar mesa» en tu página. Puedes dejar listos tus horarios y mesas; el equipo de
            Valladolid.mx lo enciende cuando lo pidas. Mientras tanto puedes anotar reservaciones por teléfono.
          </p>
        ) : !d.configured ? (
          <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            Ya está activado. Configura tus mesas y horarios en «Ajustes» para que aparezca en tu página.
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {(["agenda", "plano", "espera", "reportes"] as const).map((k) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} className="rounded-pill" onClick={() => setTab(k)}>
            {{ agenda: "Agenda", plano: "Plano", espera: "Espera", reportes: "Reportes" }[k]}
          </Button>
        ))}
        {d.canManage ? (
          <Button size="sm" variant={tab === "ajustes" ? "default" : "outline"} className="rounded-pill" onClick={() => setTab("ajustes")}>Ajustes</Button>
        ) : null}
      </div>

      {tab === "agenda" ? (
        <Agenda businessId={businessId} date={date} setDate={setDate} data={d} />
      ) : tab === "plano" ? (
        <><DayNav date={date} setDate={setDate} /><FloorPlanView businessId={businessId} date={date} reservations={d.reservations} canManage={d.canManage} /></>
      ) : tab === "espera" ? (
        <WaitlistView businessId={businessId} date={date} />
      ) : tab === "reportes" ? (
        <TableReportsView businessId={businessId} />
      ) : (
        <><ShareTableBookingCard businessId={businessId} />
        <CashierPinCard businessId={businessId} />
        <SettingsForm businessId={businessId} initial={d.settings as TableBookingSettings} />
        <PoliciesForm businessId={businessId} /></>
      )}
    </div>
  );
}

type PortalData = Awaited<ReturnType<typeof getTableBookingPortal>>;

function Agenda({ businessId, date, setDate, data }: { businessId: string; date: string; setDate: (v: string) => void; data: PortalData }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateTableReservation);
  const closeFn = useServerFn(setTableDayClosed);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["portal", "table-booking", businessId] });
  const update = useMutation({
    mutationFn: (v: { id: string; status: TableStatus }) => updateFn({ data: v }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  const close = useMutation({
    mutationFn: (closed: boolean) => closeFn({ data: { businessId, date, closed } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  const rows = data.reservations;
  const active = rows.filter((r) => occupiesTable(r.status));
  const guests = active.reduce((n, r) => n + r.party_size, 0);
  const label = date ? formatTableDate(`${date}T18:00:00Z`) : "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
        <Button size="icon" variant="ghost" aria-label="Día anterior" onClick={() => setDate(shiftDay(date, -1))}><ChevronLeft className="size-5" /></Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{label}</p>
          <p className="text-xs text-muted-foreground">{active.length} reservaciones · {guests} personas</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Día siguiente" onClick={() => setDate(shiftDay(date, 1))}><ChevronRight className="size-5" /></Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 size-4" />Agregar</Button>
        {data.canManage ? (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.closed} onCheckedChange={(v) => close.mutate(v)} aria-label="Cerrar este día" />
            {data.closed ? "Día cerrado a reservaciones" : "Abierto a reservaciones"}
          </label>
        ) : null}
      </div>

      {adding ? <StaffAddForm businessId={businessId} date={date} onDone={() => { setAdding(false); void refresh(); }} /> : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Sin reservaciones este día.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const status = r.status as TableStatus;
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold leading-tight">{formatTableTime(r.starts_at)} · {r.party_size} pers.</p>
                    <p className="text-sm">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{TABLE_SOURCE_LABEL[r.source] ?? r.source} · {r.folio}</p>
                  </div>
                  <Badge variant={status === "pendiente" ? "destructive" : "secondary"}>{TABLE_STATUS_LABEL[status] ?? r.status}</Badge>
                </div>
                {r.occasion || r.note ? (
                  <p className="mt-2 text-sm text-muted-foreground">{[r.occasion, r.note].filter(Boolean).join(" · ")}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.guest_phone ? (
                    <Button asChild size="sm" variant="outline"><a href={`tel:${r.guest_phone}`}><Phone className="mr-1 size-4" />Llamar</a></Button>
                  ) : null}
                  {r.guest_phone ? (
                    <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>Ficha</Button>
                  ) : null}
                  {nextTableActions(status).map((next) => (
                    <Button key={next} size="sm" variant={next === "cancelada" || next === "no_vino" || next === "rechazada" ? "outline" : "default"}
                      disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: next })}>
                      {next === "confirmada" ? "Confirmar" : TABLE_STATUS_LABEL[next]}
                    </Button>
                  ))}
                </div>
                {open === r.id && r.guest_phone ? <GuestProfileCard businessId={businessId} phone={r.guest_phone} name={r.guest_name} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Personas que llegaron por Valladolid.mx este día: {platformGuests(rows)}. El servicio es gratis.</p>
    </section>
  );
}

function StaffAddForm({ businessId, date, onDone }: { businessId: string; date: string; onDone: () => void }) {
  const createFn = useServerFn(createStaffTableReservation);
  const [time, setTime] = useState("14:00");
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<"telefono" | "sin_cita">("telefono");
  const m = useMutation({
    mutationFn: () =>
      createFn({ data: { businessId, startsAt: `${date}T${time}:00-06:00`, party, name: name.trim() || "Sin nombre", source, ...(phone ? { phone } : {}) } }),
    onSuccess: () => { toast.success("Reservación agregada"); onDone(); },
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" variant={source === "telefono" ? "default" : "outline"} onClick={() => setSource("telefono")}>Por teléfono</Button>
        <Button size="sm" variant={source === "sin_cita" ? "default" : "outline"} onClick={() => setSource("sin_cita")}>Llegó sin reservación</Button>
      </div>
      <label className="text-sm">Hora<Input type="time" className="mt-1" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label className="text-sm">Personas<Input type="number" min={1} max={60} className="mt-1" value={party} onChange={(e) => setParty(Number(e.target.value) || 1)} /></label>
      <label className="text-sm">Nombre<Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="text-sm">Teléfono (opcional)<Input className="mt-1" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <Button className="sm:col-span-2" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Guardando…" : "Guardar"}</Button>
    </div>
  );
}

function SettingsForm({ businessId, initial }: { businessId: string; initial: TableBookingSettings }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveTableBookingSettings);
  const [s, setS] = useState<TableBookingSettings>(initial);
  const save = useMutation({
    mutationFn: async () => {
      const n = normalizeTableSettings(s);
      if (!n.ok) throw new Error(n.error);
      await saveFn({ data: { businessId, settings: n.value } });
    },
    onSuccess: () => { toast.success("Ajustes guardados"); void qc.invalidateQueries({ queryKey: ["portal", "table-booking", businessId] }); },
    onError: (e: Error) => toast.error(portalErrorMessage(e)),
  });
  const num = (k: keyof TableBookingSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) || 0 });

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Mesas</h2>
        <p className="text-sm text-muted-foreground">Cuántas mesas tienes de cada tamaño.</p>
        <ul className="mt-2 space-y-2">
          {s.tables.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Input type="number" min={1} max={100} className="w-20" value={t.count} aria-label="Cantidad de mesas"
                onChange={(e) => setS({ ...s, tables: s.tables.map((x, j) => (j === i ? { ...x, count: Number(e.target.value) || 0 } : x)) })} />
              mesas de
              <Input type="number" min={1} max={30} className="w-20" value={t.seats} aria-label="Personas por mesa"
                onChange={(e) => setS({ ...s, tables: s.tables.map((x, j) => (j === i ? { ...x, seats: Number(e.target.value) || 0 } : x)) })} />
              personas
              <Button size="icon" variant="ghost" aria-label="Quitar" onClick={() => setS({ ...s, tables: s.tables.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setS({ ...s, tables: [...s.tables, { seats: 4, count: 1 }] })}><Plus className="mr-1 size-4" />Agregar tipo de mesa</Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Horario de reservaciones</h2>
        <ul className="mt-2 space-y-2">
          {WEEKDAYS.map((d) => {
            const range = s.hours[d.key]?.[0];
            return (
              <li key={d.key} className="flex flex-wrap items-center gap-2 text-sm">
                <Switch checked={Boolean(range)} aria-label={`Abrir ${d.label}`}
                  onCheckedChange={(on) => setS({ ...s, hours: { ...s.hours, [d.key]: on ? [["08:00", "22:00"]] : [] } })} />
                <span className="w-24">{d.label}</span>
                {range ? (
                  <>
                    <Input type="time" className="w-28" value={range[0]} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d.key]: [[e.target.value, range[1]]] } })} />
                    a
                    <Input type="time" className="w-28" value={range[1]} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d.key]: [[range[0], e.target.value]] } })} />
                  </>
                ) : <span className="text-muted-foreground">Cerrado</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Cada cuántos minutos hay horario<Input type="number" className="mt-1" value={s.slot_minutes} onChange={num("slot_minutes")} /></label>
        <label className="text-sm">Minutos que dura una mesa<Input type="number" className="mt-1" value={s.duration_minutes} onChange={num("duration_minutes")} /></label>
        <label className="text-sm">Máximo de personas por reservación<Input type="number" className="mt-1" value={s.max_party} onChange={num("max_party")} /></label>
        <label className="text-sm">Anticipación mínima (minutos)<Input type="number" className="mt-1" value={s.min_notice_minutes} onChange={num("min_notice_minutes")} /></label>
        <label className="text-sm">Días hacia adelante que se puede reservar<Input type="number" className="mt-1" value={s.max_days_ahead} onChange={num("max_days_ahead")} /></label>
        <label className="flex items-center gap-2 text-sm sm:mt-6">
          <Switch checked={s.confirm_mode === "confirmacion"} onCheckedChange={(v) => setS({ ...s, confirm_mode: v ? "confirmacion" : "inmediata" })} />
          {s.confirm_mode === "confirmacion" ? "Yo confirmo cada reservación" : "Se confirman solas"}
        </label>
      </div>
      <div className="flex justify-end"><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Guardando…" : "Guardar ajustes"}</Button></div>
    </section>
  );
}

function DayNav({ date, setDate }: { date: string; setDate: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
      <Button size="icon" variant="ghost" aria-label="Día anterior" onClick={() => setDate(shiftDay(date, -1))}><ChevronLeft className="size-5" /></Button>
      <p className="text-sm font-semibold capitalize">{date ? formatTableDate(`${date}T18:00:00Z`) : ""}</p>
      <Button size="icon" variant="ghost" aria-label="Día siguiente" onClick={() => setDate(shiftDay(date, 1))}><ChevronRight className="size-5" /></Button>
    </div>
  );
}

/** Personas mínimas y políticas que el cliente lee antes de reservar (como OpenTable). */
function PoliciesForm({ businessId }: { businessId: string }) {
  type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const q = useQuery({
    queryKey: ["table-booking-policies", businessId],
    queryFn: async () => {
      const { data } = await (supabase.from("restaurant_booking_settings") as unknown as {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { min_party: number; policies: string | null } | null }> } };
      }).select("min_party, policies").eq("business_id", businessId).maybeSingle();
      return data ?? { min_party: 1, policies: null };
    },
  });
  const [minParty, setMinParty] = useState(1);
  const [policies, setPolicies] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) { setMinParty(q.data.min_party ?? 1); setPolicies(q.data.policies ?? ""); }
  }, [q.data]);
  async function save() {
    setBusy(true);
    const { error } = await (supabase.rpc as unknown as Rpc).bind(supabase)("restaurant_booking_policies_save", { _business_id: businessId, _min_party: minParty, _policies: policies });
    setBusy(false);
    if (error) toast.error("No se pudo guardar.");
    else { toast.success("Políticas guardadas."); void q.refetch(); }
  }
  return (
    <section className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Políticas para el cliente</h2>
      <p className="text-sm text-muted-foreground">Se muestran antes de reservar y en el enlace donde el cliente cambia o cancela.</p>
      <label className="block text-sm">Mínimo de personas por reservación
        <Input type="number" min={1} className="mt-1 w-32" value={minParty} onChange={(e) => setMinParty(Math.max(1, Number(e.target.value) || 1))} />
      </label>
      <label className="block text-sm">Políticas (tolerancia, cancelación, niños, mascotas…)
        <textarea className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={1500}
          value={policies} placeholder="Ej. Tolerancia de 15 minutos. Si no puedes venir, cancela desde tu enlace." onChange={(e) => setPolicies(e.target.value)} />
      </label>
      <div className="flex justify-end"><Button disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar políticas"}</Button></div>
    </section>
  );
}
