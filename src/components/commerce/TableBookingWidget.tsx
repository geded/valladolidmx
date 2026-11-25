/**
 * TableBookingWidget — bloque «Reservar mesa» de la ficha del restaurante.
 * Solo aparece cuando Administración activó el modo «mesas» y el restaurante
 * configuró sus mesas; si no, no dibuja nada y la plantilla queda igual.
 * La disponibilidad viene siempre de `restaurant_public_slots`.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, Clock, Minus, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendTableBookingNotices } from "@/lib/commerce/table-booking.functions";
import { formatTableDate, formatTableTime, meridaToday, tableBookingError } from "@/lib/commerce/table-booking";

type Config = { enabled: boolean; max_party?: number; max_days_ahead?: number; confirm_mode?: string };
type Slot = { slot_time: string; starts_at: string; available: boolean };
type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);

const OCCASIONS = ["", "Cumpleaños", "Aniversario", "Reunión de negocios", "Cita", "Celebración"];

const PREF_TIMES = Array.from({ length: 33 }, (_, i) => { const m = 7 * 60 + i * 30; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; });

function minutes(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function to12h(t: string): string {
  const m = minutes(t);
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

function SlotButton({ s, active, onPick }: { s: Slot; active: boolean; onPick: (s: Slot) => void }) {
  return (
    <Button type="button" size="sm" variant="default" aria-pressed={active}
      className={`h-9 w-full rounded-md px-1 text-xs font-semibold ${active ? "ring-focus ring-2 ring-offset-2" : ""}`}
      onClick={() => onPick(s)}>{to12h(s.slot_time)}</Button>
  );
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function TableBookingWidget({ businessId, businessName }: { businessId: string; businessName: string }) {
  const notify = useServerFn(sendTableBookingNotices);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = useMemo(() => (mounted ? meridaToday() : ""), [mounted]);

  const config = useQuery({
    queryKey: ["table-booking-config", businessId],
    enabled: mounted,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_public_booking_config", { _business_id: businessId });
      if (error) return { enabled: false } as Config;
      return (data ?? { enabled: false }) as Config;
    },
  });

  const [date, setDate] = useState("");
  const [party, setParty] = useState(2);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ folio: string; status: string; starts_at: string; party_size: number } | null>(null);

  useEffect(() => {
    if (today && !date) setDate(today);
  }, [today, date]);

  const slots = useQuery({
    queryKey: ["table-booking-slots", businessId, date, party],
    enabled: Boolean(config.data?.enabled && date),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_public_slots", { _business_id: businessId, _date: date, _party: party });
      if (error) throw new Error(error.message);
      return (data ?? []) as Slot[];
    },
  });

  const [prefTime, setPrefTime] = useState("19:00");
  const [showAll, setShowAll] = useState(false);
  const available = useMemo(() => (slots.data ?? []).filter((s) => s.available), [slots.data]);
  const nearest = useMemo(() => {
    const pref = minutes(prefTime);
    return [...available].sort((a, b) => Math.abs(minutes(a.slot_time) - pref) - Math.abs(minutes(b.slot_time) - pref))
      .slice(0, 5).sort((a, b) => minutes(a.slot_time) - minutes(b.slot_time));
  }, [available, prefTime]);
  const nearMissing = available.length > 0 && !available.some((s) => s.slot_time.slice(0, 5) === prefTime);
  const groups = useMemo(() => {
    const defs = [{ label: "Desayuno", to: 720 }, { label: "Comida", to: 1080 }, { label: "Cena", to: 1440 }];
    return defs.map((d, i) => ({ label: d.label, items: available.filter((s) => { const m = minutes(s.slot_time); return m < d.to && m >= (i ? defs[i - 1]!.to : 0); }) }))
      .filter((g) => g.items.length);
  }, [available]);
  const quickDays = useMemo(() => {
    if (!today) return [];
    const maxN = Math.min(13, config.data?.max_days_ahead ?? 60);
    return Array.from({ length: maxN + 1 }, (_, i) => {
      const iso = addDays(today, i);
      const label = i === 0 ? "Hoy" : i === 1 ? "Mañana" : new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", timeZone: "UTC" });
      return { iso, label };
    });
  }, [today, config.data?.max_days_ahead]);

  if (!config.data?.enabled) return null;
  const maxParty = config.data.max_party ?? 8;
  const maxDate = addDays(today || date, config.data.max_days_ahead ?? 60);

  async function submit() {
    if (!slot) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await rpc("restaurant_book", {
      _business_id: businessId, _starts_at: slot.starts_at, _party: party, _name: name, _phone: phone,
      _email: email || null, _occasion: occasion || null, _note: note || null, _source: "pagina",
    });
    setBusy(false);
    if (err) {
      setError(tableBookingError(err.message));
      if (err.message.includes("slot_unavailable")) {
        setSlot(null);
        void slots.refetch();
      }
      return;
    }
    const r = data as { id: string; folio: string; status: string; starts_at: string; party_size: number };
    setDone(r);
    void notify({ data: { reservationId: r.id } }).catch(() => undefined);
  }

  if (done) {
    return (
      <section id="reservar-mesa" data-eb-anchor className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-soft sm:mt-10 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl">{done.status === "pendiente" ? "Solicitud enviada" : "¡Mesa reservada!"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {businessName} · {done.party_size} personas · {formatTableDate(done.starts_at)}, {formatTableTime(done.starts_at)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Folio {done.folio}</p>
            {done.status === "pendiente" ? (
              <p className="mt-2 text-sm">El restaurante te confirmará pronto por WhatsApp.</p>
            ) : (
              <p className="mt-2 text-sm">Te mandamos la confirmación por WhatsApp.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="reservar-mesa" data-eb-anchor className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-soft sm:mt-10 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reservar mesa</p>
      <h2 className="mt-1 text-2xl">Aparta tu mesa en {businessName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sin costo. Elige personas, fecha y hora.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="text-sm font-medium">
          <span className="flex items-center gap-1.5"><Users className="size-4" aria-hidden /> Personas</span>
          <div className="mt-1 flex h-10 items-center justify-between rounded-md border border-input px-2">
            <Button type="button" size="icon" variant="ghost" aria-label="Menos personas" disabled={party <= 1}
              onClick={() => { setParty((p) => Math.max(1, p - 1)); setSlot(null); }}><Minus className="size-4" /></Button>
            <span aria-live="polite">{party} {party === 1 ? "persona" : "personas"}</span>
            <Button type="button" size="icon" variant="ghost" aria-label="Más personas" disabled={party >= maxParty}
              onClick={() => { setParty((p) => Math.min(maxParty, p + 1)); setSlot(null); }}><Plus className="size-4" /></Button>
          </div>
        </div>
        <label className="block text-sm font-medium">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> Fecha</span>
          <Input type="date" className="mt-1" value={date} min={today} max={maxDate}
            onChange={(e) => { setDate(e.target.value); setSlot(null); setShowAll(false); }} />
        </label>
        <label className="block text-sm font-medium">
          <span className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> Hora</span>
          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={prefTime}
            onChange={(e) => { setPrefTime(e.target.value); setSlot(null); setShowAll(false); }}>
            {PREF_TIMES.map((t) => <option key={t} value={t}>{to12h(t)}</option>)}
          </select>
        </label>
      </div>

      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="list" aria-label="Días próximos">
        {quickDays.map((d) => (
          <button key={d.iso} type="button" role="listitem"
            className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${date === d.iso ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary"}`}
            onClick={() => { setDate(d.iso); setSlot(null); setShowAll(false); }}>{d.label}</button>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Elige una hora</p>
        {slots.isLoading ? (
          <div className="mt-2 flex gap-2" aria-label="Buscando horarios">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-20 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : available.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {(slots.data ?? []).length === 0 ? "El restaurante no recibe reservaciones ese día." : `Ya no quedan mesas para ${party} ese día.`} Prueba otra fecha{(slots.data ?? []).length ? " o menos personas" : ""}.
          </p>
        ) : (
          <>
            {!showAll ? (
              <>
                {nearMissing ? <p className="mt-1 text-xs text-muted-foreground">No hay mesa a las {to12h(prefTime)}; estos son los horarios más cercanos.</p> : null}
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {nearest.map((s) => <SlotButton key={s.starts_at} s={s} active={slot?.starts_at === s.starts_at} onPick={setSlot} />)}
                </div>
                {available.length > nearest.length ? (
                  <button type="button" className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => setShowAll(true)}>
                    Ver todos los horarios ({available.length})
                  </button>
                ) : null}
              </>
            ) : (
              <div className="mt-2 space-y-3">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g.label}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {g.items.map((s) => <SlotButton key={s.starts_at} s={s} active={slot?.starts_at === s.starts_at} onPick={setSlot} />)}
                    </div>
                  </div>
                ))}
                <button type="button" className="text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => setShowAll(false)}>Ver menos</button>
              </div>
            )}
          </>
        )}
        {slot ? (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
            {party} {party === 1 ? "persona" : "personas"} · {formatTableDate(slot.starts_at)} · {to12h(slot.slot_time)}
          </p>
        ) : null}
      </div>

      {slot ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Nombre
            <Input className="mt-1" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">WhatsApp
            <Input className="mt-1" value={phone} inputMode="tel" autoComplete="tel" maxLength={16} placeholder="985 123 4567" onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Correo (opcional)
            <Input className="mt-1" type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Ocasión (opcional)
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {OCCASIONS.map((o) => <option key={o} value={o}>{o || "Ninguna"}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Nota para el restaurante (opcional)
            <Textarea className="mt-1" rows={2} maxLength={500} value={note} placeholder="Alergias, silla para bebé, terraza…" onChange={(e) => setNote(e.target.value)} />
          </label>
          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          <Button className="sm:col-span-2" disabled={busy || name.trim().length < 2 || phone.replace(/\D/g, "").length < 10} onClick={() => void submit()}>
            {busy ? "Reservando…" : config.data.confirm_mode === "confirmacion" ? `Solicitar mesa a las ${to12h(slot.slot_time)}` : `Reservar a las ${to12h(slot.slot_time)}`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
