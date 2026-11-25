/**
 * TableBookingWidget — bloque «Reservar mesa» de la ficha del restaurante.
 * Solo aparece cuando Administración activó el modo «mesas» y el restaurante
 * configuró sus mesas; si no, no dibuja nada y la plantilla queda igual.
 * La disponibilidad viene siempre de `restaurant_public_slots`.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, Minus, Plus, Users } from "lucide-react";
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
      <p className="mt-1 text-sm text-muted-foreground">Sin costo. Elige el día, cuántas personas y la hora.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> Día</span>
          <Input type="date" className="mt-1" value={date} min={today} max={maxDate}
            onChange={(e) => { setDate(e.target.value); setSlot(null); }} />
        </label>
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
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">Hora</p>
        {slots.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Buscando horarios…</p>
        ) : (slots.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No hay horarios ese día. Prueba otra fecha.</p>
        ) : (slots.data ?? []).every((s) => !s.available) ? (
          <p className="mt-2 text-sm text-muted-foreground">Ya no quedan mesas para {party} ese día. Prueba otra fecha o menos personas.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {(slots.data ?? []).filter((s) => s.available).map((s) => (
              <Button key={s.starts_at} type="button" size="sm" variant={slot?.starts_at === s.starts_at ? "default" : "outline"}
                className="rounded-pill" onClick={() => setSlot(s)}>{s.slot_time}</Button>
            ))}
          </div>
        )}
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
            {busy ? "Reservando…" : config.data.confirm_mode === "confirmacion" ? `Solicitar mesa a las ${slot.slot_time}` : `Reservar a las ${slot.slot_time}`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
