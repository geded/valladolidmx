/**
 * Reservar mesa · Etapa 2 en el Portal: plano de mesas (ver y acomodar),
 * lista de espera, ficha del comensal y reportes. Mismo lenguaje visual
 * que la agenda de la Etapa 1.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addWaitlist, assignReservationTable, getGuestProfile, getTableFloor, getTableReport,
  saveGuestNote, saveTableFloor, setWaitlistStatus,
} from "@/lib/commerce/table-floor.functions";
import { FLOOR_COLS, FLOOR_ROWS, GUEST_TAGS, floorFromGroups, type FloorTable } from "@/lib/commerce/table-floor";
import { TABLE_SOURCE_LABEL, formatTableDate, formatTableTime, occupiesTable, tableBookingError } from "@/lib/commerce/table-booking";
import type { TableReservationRow } from "@/lib/commerce/table-booking.functions";

const floorKey = (b: string, d: string) => ["portal", "table-floor", b, d];

export function useTableFloor(businessId: string, date: string) {
  const fn = useServerFn(getTableFloor);
  return useQuery({ queryKey: floorKey(businessId, date), queryFn: () => fn({ data: { businessId, date } }), refetchInterval: 60_000 });
}

/* ---------------------------- Plano ---------------------------- */

export function FloorPlanView({ businessId, date, reservations, canManage }: {
  businessId: string; date: string; reservations: TableReservationRow[]; canManage: boolean;
}) {
  const q = useTableFloor(businessId, date);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const assignFn = useServerFn(assignReservationTable);
  const assign = useMutation({
    mutationFn: (v: { id: string; tableId: string | null }) => assignFn({ data: v }),
    onSuccess: () => { setPicked(null); void qc.invalidateQueries({ queryKey: floorKey(businessId, date) }); },
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  if (!q.data) return <p className="text-sm text-muted-foreground">Cargando plano…</p>;
  const plan = q.data.plan.length ? q.data.plan : floorFromGroups(q.data.groups);
  if (editing) return <FloorEditor businessId={businessId} initial={plan} onClose={() => { setEditing(false); void qc.invalidateQueries({ queryKey: floorKey(businessId, date) }); }} />;

  const active = reservations.filter((r) => occupiesTable(r.status));
  const byTable = new Map<string, TableReservationRow[]>();
  for (const r of active) {
    const t = q.data.assigned[r.id];
    if (t) byTable.set(t, [...(byTable.get(t) ?? []), r]);
  }
  const unassigned = active.filter((r) => !q.data.assigned[r.id]);
  const pickedRow = active.find((r) => r.id === picked);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pickedRow ? `Toca la mesa para ${pickedRow.guest_name} (${pickedRow.party_size} pers.)` : "Toca una reservación y luego su mesa."}
        </p>
        {canManage ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Acomodar mesas</Button> : null}
      </div>
      {!q.data.plan.length ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Este plano se armó con tus mesas de «Ajustes». Usa «Acomodar mesas» para moverlas, nombrarlas y separarlas por zona.
        </p>
      ) : null}
      <FloorGrid plan={plan} render={(t) => {
        const rows = byTable.get(t.id) ?? [];
        const seated = rows.some((r) => r.status === "sentada" || r.status === "llego");
        const tone = seated ? "bg-primary text-primary-foreground" : rows.length ? "bg-warning/30" : "bg-card";
        return (
          <button type="button" disabled={!pickedRow || assign.isPending}
            onClick={() => pickedRow && assign.mutate({ id: pickedRow.id, tableId: t.id })}
            className={`flex h-full w-full flex-col items-center justify-center border border-border text-[11px] leading-tight shadow-soft ${t.round ? "rounded-full" : "rounded-lg"} ${tone} ${pickedRow && pickedRow.party_size > t.seats ? "opacity-50" : ""}`}>
            <span className="font-semibold">{t.label}</span>
            <span>{rows.length ? `${formatTableTime(rows[0]!.starts_at)} · ${rows[0]!.guest_name.split(" ")[0]}` : `${t.seats} lug.`}</span>
          </button>
        );
      }} />
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-card ring-1 ring-border" />Libre</span>
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-warning/30" />Reservada</span>
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-primary" />Ocupada</span>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">Reservaciones del día</p>
        <ul className="flex flex-wrap gap-2">
          {active.map((r) => {
            const t = plan.find((x) => x.id === q.data.assigned[r.id]);
            return (
              <li key={r.id}>
                <Button size="sm" variant={picked === r.id ? "default" : unassigned.includes(r) ? "outline" : "secondary"} onClick={() => setPicked(picked === r.id ? null : r.id)}>
                  {formatTableTime(r.starts_at)} {r.guest_name.split(" ")[0]} · {r.party_size}{t ? ` · ${t.label}` : ""}
                </Button>
              </li>
            );
          })}
          {active.length === 0 ? <li className="text-sm text-muted-foreground">Sin reservaciones este día.</li> : null}
        </ul>
        {pickedRow && q.data.assigned[pickedRow.id] ? (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => assign.mutate({ id: pickedRow.id, tableId: null })}>Quitar mesa</Button>
        ) : null}
      </div>
    </section>
  );
}

function FloorGrid({ plan, render, gridRef }: { plan: FloorTable[]; render: (t: FloorTable) => React.ReactNode; gridRef?: React.Ref<HTMLDivElement> }) {
  const zones = [...new Set(plan.map((t) => t.zone))];
  return (
    <div ref={gridRef} className="relative w-full touch-none overflow-hidden rounded-xl border border-border bg-muted/30"
      style={{ aspectRatio: `${FLOOR_COLS} / ${FLOOR_ROWS}`, backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)", backgroundSize: `${100 / FLOOR_COLS}% ${100 / FLOOR_ROWS}%` }}>
      {plan.map((t) => (
        <div key={t.id} className="absolute p-0.5" style={{ left: `${(t.x / FLOOR_COLS) * 100}%`, top: `${(t.y / FLOOR_ROWS) * 100}%`, width: `${(2 / FLOOR_COLS) * 100}%`, height: `${(1 / FLOOR_ROWS) * 100}%` }}>
          {render(t)}
        </div>
      ))}
      {zones.length > 1 ? <p className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">{zones.join(" · ")}</p> : null}
    </div>
  );
}

function FloorEditor({ businessId, initial, onClose }: { businessId: string; initial: FloorTable[]; onClose: () => void }) {
  const [plan, setPlan] = useState<FloorTable[]>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<string | null>(null);
  const saveFn = useServerFn(saveTableFloor);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { businessId, plan } }),
    onSuccess: () => { toast.success("Plano guardado. Tu página usa estas mesas."); onClose(); },
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const id = drag.current; const el = grid.current;
      if (!id || !el) return;
      const r = el.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * FLOOR_COLS - 1);
      const y = Math.round(((e.clientY - r.top) / r.height) * FLOOR_ROWS - 0.5);
      setPlan((p) => p.map((t) => t.id === id ? { ...t, x: Math.min(Math.max(x, 0), FLOOR_COLS - 2), y: Math.min(Math.max(y, 0), FLOOR_ROWS - 1) } : t));
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);
  const t = plan.find((x) => x.id === sel);
  const patch = (p: Partial<FloorTable>) => setPlan((all) => all.map((x) => x.id === sel ? { ...x, ...p } : x));
  const add = () => {
    const n = plan.reduce((m, x) => Math.max(m, Number(x.id.replace(/\D/g, "")) || 0), 0) + 1;
    const id = `m${n}`;
    setPlan((p) => [...p, { id, label: `Mesa ${n}`, seats: 4, zone: t?.zone ?? "Salón", x: 0, y: 0 }]);
    setSel(id);
  };
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">Arrastra las mesas. Toca una para cambiar su nombre, lugares o zona.</p>
      <FloorGrid gridRef={grid} plan={plan} render={(x) => (
        <button type="button" onPointerDown={(e) => { e.preventDefault(); drag.current = x.id; setSel(x.id); }}
          className={`flex h-full w-full cursor-grab flex-col items-center justify-center border text-[11px] shadow-soft ${x.round ? "rounded-full" : "rounded-lg"} ${sel === x.id ? "border-primary bg-primary/15" : "border-border bg-card"}`}>
          <span className="font-semibold">{x.label}</span><span>{x.seats} lug.</span>
        </button>
      )} />
      {t ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
          <label className="text-sm">Nombre<Input className="mt-1" value={t.label} onChange={(e) => patch({ label: e.target.value })} /></label>
          <label className="text-sm">Lugares<Input type="number" min={1} max={30} className="mt-1" value={t.seats} onChange={(e) => patch({ seats: Number(e.target.value) || 1 })} /></label>
          <label className="text-sm">Zona<Input className="mt-1" value={t.zone} placeholder="Salón, Terraza, Barra…" onChange={(e) => patch({ zone: e.target.value })} /></label>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="outline" onClick={() => patch({ round: !t.round })}>{t.round ? "Cuadrada" : "Redonda"}</Button>
            <Button size="icon" variant="ghost" aria-label="Quitar mesa" onClick={() => { setPlan((p) => p.filter((x) => x.id !== sel)); setSel(null); }}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={add}><Plus className="mr-1 size-4" />Agregar mesa</Button>
        <Button size="sm" disabled={save.isPending || plan.length === 0} onClick={() => save.mutate()}>{save.isPending ? "Guardando…" : "Guardar plano"}</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </section>
  );
}

/* ------------------------ Lista de espera ------------------------ */

const WAIT_LABEL: Record<string, string> = { esperando: "Esperando", avisado: "Avisado", sentado: "Sentado", se_fue: "Se fue" };

export function WaitlistView({ businessId, date }: { businessId: string; date: string }) {
  const q = useTableFloor(businessId, date);
  const qc = useQueryClient();
  const addFn = useServerFn(addWaitlist);
  const setFn = useServerFn(setWaitlistStatus);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [party, setParty] = useState(2); const [quoted, setQuoted] = useState(15);
  const refresh = () => qc.invalidateQueries({ queryKey: floorKey(businessId, date) });
  const add = useMutation({
    mutationFn: () => addFn({ data: { businessId, name: name.trim(), party, quoted, ...(phone ? { phone } : {}) } }),
    onSuccess: () => { setName(""); setPhone(""); void refresh(); },
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  const set = useMutation({
    mutationFn: (v: { id: string; status: "esperando" | "avisado" | "sentado" | "se_fue" }) => setFn({ data: v }),
    onSuccess: refresh, onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  const list = q.data?.waitlist ?? [];
  const waiting = list.filter((w) => w.status === "esperando" || w.status === "avisado");
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
        <label className="col-span-2 text-sm">Nombre<Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-sm">WhatsApp (opcional)<Input className="mt-1" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className="text-sm">Personas<Input type="number" min={1} max={60} className="mt-1" value={party} onChange={(e) => setParty(Number(e.target.value) || 1)} /></label>
        <label className="text-sm">Espera estimada (min)<Input type="number" min={0} max={240} className="mt-1" value={quoted} onChange={(e) => setQuoted(Number(e.target.value) || 0)} /></label>
        <div className="flex items-end"><Button className="w-full" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}><Plus className="mr-1 size-4" />Anotar</Button></div>
      </div>
      <p className="text-sm text-muted-foreground">{waiting.length} en espera · {waiting.reduce((n, w) => n + w.party_size, 0)} personas</p>
      <ul className="space-y-2">
        {list.map((w) => {
          const mins = Math.max(0, Math.round((Date.now() - new Date(w.created_at).getTime()) / 60_000));
          const msg = encodeURIComponent(`Hola ${w.guest_name.split(" ")[0]}, tu mesa ya está lista. Te esperamos.`);
          return (
            <li key={w.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{w.guest_name} · {w.party_size} pers.</p>
                  <p className="text-xs text-muted-foreground">Lleva {mins} min · estimado {w.quoted_minutes} min</p>
                </div>
                <Badge variant={w.status === "esperando" && mins > w.quoted_minutes ? "destructive" : "secondary"}>{WAIT_LABEL[w.status] ?? w.status}</Badge>
              </div>
              {w.status === "esperando" || w.status === "avisado" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {w.guest_phone ? (
                    <Button asChild size="sm" variant="outline" onClick={() => set.mutate({ id: w.id, status: "avisado" })}>
                      <a href={`https://wa.me/${w.guest_phone.replace(/\D/g, "").replace(/^(\d{10})$/, "52$1")}?text=${msg}`} target="_blank" rel="noreferrer">Avisar por WhatsApp</a>
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => set.mutate({ id: w.id, status: "sentado" })}>Sentar</Button>
                  <Button size="sm" variant="outline" onClick={() => set.mutate({ id: w.id, status: "se_fue" })}>Se fue</Button>
                </div>
              ) : null}
            </li>
          );
        })}
        {list.length === 0 ? <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nadie en espera hoy.</li> : null}
      </ul>
    </section>
  );
}

/* ------------------------ Ficha del comensal ------------------------ */

export function GuestProfileCard({ businessId, phone, name }: { businessId: string; phone: string; name: string }) {
  const fn = useServerFn(getGuestProfile);
  const saveFn = useServerFn(saveGuestNote);
  const q = useQuery({ queryKey: ["portal", "table-guest", businessId, phone], queryFn: () => fn({ data: { businessId, phone } }) });
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => { if (q.data) { setTags(q.data.tags); setNote(q.data.note); } }, [q.data]);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { businessId, key: q.data!.key, tags, note } }),
    onSuccess: () => toast.success("Ficha guardada"),
    onError: (e: Error) => toast.error(tableBookingError(e.message)),
  });
  if (q.isLoading) return <p className="text-xs text-muted-foreground">Cargando ficha…</p>;
  if (!q.data) return <p className="text-xs text-muted-foreground">Sin teléfono válido para la ficha.</p>;
  const s = q.data.summary;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <p className="flex items-center gap-1 font-semibold"><Users className="size-4" />{name}</p>
      <p className="text-xs text-muted-foreground">
        {s.visits} visitas · {s.noShows} no vino · {s.upcoming} próximas{s.lastVisit ? ` · última ${formatTableDate(s.lastVisit)}` : ""}
      </p>
      <div className="flex flex-wrap gap-1">
        {GUEST_TAGS.map((tag) => (
          <Button key={tag} size="sm" variant={tags.includes(tag) ? "default" : "outline"} className="h-7 rounded-pill px-2 text-xs"
            onClick={() => setTags((t) => t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag])}>{tag}</Button>
        ))}
      </div>
      <textarea className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-sm" placeholder="Preferencias, alergias, mesa favorita…" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>Guardar ficha</Button>
    </div>
  );
}

/* ---------------------------- Reportes ---------------------------- */

export function TableReportsView({ businessId }: { businessId: string }) {
  const [days, setDays] = useState(30);
  const fn = useServerFn(getTableReport);
  const q = useQuery({ queryKey: ["portal", "table-report", businessId, days], queryFn: () => fn({ data: { businessId, days } }) });
  const r = q.data;
  const hours = r ? Object.entries(r.byHour).sort((a, b) => a[0].localeCompare(b[0])) : [];
  const peak = Math.max(1, ...hours.map(([, n]) => n));
  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? "default" : "outline"} className="rounded-pill" onClick={() => setDays(d)}>{d} días</Button>)}
      </div>
      {!r ? <p className="text-sm text-muted-foreground">Calculando…</p> : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Reservaciones", r.reservations], ["Personas atendidas", r.guests],
              ["No vinieron", `${r.noShows} (${r.noShowRate}%)`], ["Por Valladolid.mx", r.platformGuests],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-sm font-semibold">De dónde llegaron (personas)</p>
            {Object.entries(r.bySource).map(([k, v]) => <p key={k} className="flex justify-between text-sm"><span>{TABLE_SOURCE_LABEL[k] ?? k}</span><span>{v}</span></p>)}
            {Object.keys(r.bySource).length === 0 ? <p className="text-sm text-muted-foreground">Aún sin visitas atendidas.</p> : null}
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-sm font-semibold">Horas con más gente</p>
            {hours.map(([h, n]) => (
              <div key={h} className="flex items-center gap-2 text-xs">
                <span className="w-10">{h}:00</span>
                <span className="h-3 rounded bg-primary" style={{ width: `${(n / peak) * 80}%` }} /><span>{n}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Cancelaciones: {r.cancelled}.</p>
        </>
      )}
    </section>
  );
}
