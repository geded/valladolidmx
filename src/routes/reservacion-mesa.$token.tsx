/**
 * /reservacion-mesa/$token — enlace privado del cliente (como OpenTable):
 * ve su reservación, la cambia (fecha, hora, personas) o la cancela.
 * El enlace llega por WhatsApp y en la confirmación; noindex.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { formatTableDate, formatTableTime, meridaToday, tableBookingError } from "@/lib/commerce/table-booking";

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);

type Res = {
  folio: string; status: string; starts_at: string; party_size: number; guest_name: string;
  business_id: string; business_name: string | null; policies: string | null;
  max_party: number | null; min_party: number | null; max_days_ahead: number | null; can_change: boolean;
};
type Slot = { slot_time: string; starts_at: string; available: boolean };

const STATUS: Record<string, string> = {
  pendiente: "Esperando confirmación del restaurante", confirmada: "Confirmada", llego: "Llegaste", sentada: "En tu mesa",
  terminada: "Terminada", no_vino: "No se presentó", cancelada: "Cancelada", rechazada: "El restaurante no pudo recibirte",
};

export const Route = createFileRoute("/reservacion-mesa/$token")({
  head: () =>
    buildPublicHead({
      title: `Tu reservación de mesa · ${SITE.name}`,
      description: "Consulta, cambia o cancela tu reservación de mesa en Valladolid.mx.",
      path: "/reservacion-mesa",
      noindex: true,
    }),
  component: ManageReservationPage,
});

function ManageReservationPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const res = useQuery({
    queryKey: ["table-reservation-manage", token],
    enabled: mounted,
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_manage_get", { _token: token });
      if (error) throw new Error(error.message);
      return (data ?? null) as Res | null;
    },
  });
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const r = res.data;

  async function cancel() {
    setBusy(true); setMsg(null);
    const { error } = await rpc("restaurant_manage_cancel", { _token: token });
    setBusy(false);
    if (error) { setMsg(tableBookingError(error.message)); return; }
    setConfirmCancel(false);
    await qc.invalidateQueries({ queryKey: ["table-reservation-manage", token] });
    setMsg("Tu reservación quedó cancelada. El restaurante ya fue avisado.");
  }

  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tu reservación de mesa</p>
        {!mounted || res.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted" />
        ) : !r ? (
          <p className="mt-4 text-sm text-muted-foreground">No encontramos esta reservación. Revisa el enlace que te llegó por WhatsApp.</p>
        ) : (
          <section className="mt-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h1 className="text-2xl">{r.business_name ?? "Restaurante"}</h1>
            <p className="mt-2 text-sm">{formatTableDate(r.starts_at)} · {formatTableTime(r.starts_at)}</p>
            <p className="text-sm">{r.party_size} {r.party_size === 1 ? "persona" : "personas"} · a nombre de {r.guest_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">Folio {r.folio} · {STATUS[r.status] ?? r.status}</p>
            {r.policies ? (
              <div className="mt-4 rounded-md border border-border px-3 py-2 text-sm">
                <p className="font-semibold">Políticas del restaurante</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{r.policies}</p>
              </div>
            ) : null}
            {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
            {r.can_change && !editing ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => { setEditing(true); setMsg(null); }}>Cambiar fecha, hora o personas</Button>
                {confirmCancel ? (
                  <>
                    <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelando…" : "Sí, cancelar"}</Button>
                    <Button variant="ghost" onClick={() => setConfirmCancel(false)}>No</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancelar reservación</Button>
                )}
              </div>
            ) : null}
            {r.can_change && editing ? (
              <ModifyForm token={token} r={r} onDone={async (text) => {
                setEditing(false); setMsg(text);
                await qc.invalidateQueries({ queryKey: ["table-reservation-manage", token] });
              }} onClose={() => setEditing(false)} />
            ) : null}
          </section>
        )}
      </main>
    </PublicShell>
  );
}

function ModifyForm({ token, r, onDone, onClose }: { token: string; r: Res; onDone: (msg: string) => void; onClose: () => void }) {
  const today = meridaToday();
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida" }).format(new Date(r.starts_at)));
  const [party, setParty] = useState(r.party_size);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const minParty = Math.max(1, r.min_party ?? 1);
  const maxParty = r.max_party ?? 8;
  const slots = useQuery({
    queryKey: ["table-manage-slots", r.business_id, date, party],
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_public_slots", { _business_id: r.business_id, _date: date, _party: party });
      if (error) throw new Error(error.message);
      return (data ?? []) as Slot[];
    },
  });
  // Su propia hora sigue disponible para ella aunque el cálculo general la marque ocupada.
  const list = (slots.data ?? []).filter((s) => s.available || s.starts_at === r.starts_at);

  async function choose(s: Slot) {
    setBusy(true); setErr(null);
    const { data, error } = await rpc("restaurant_manage_modify", { _token: token, _starts_at: s.starts_at, _party: party });
    setBusy(false);
    if (error) { setErr(tableBookingError(error.message)); void slots.refetch(); return; }
    const st = (data as { status: string }).status;
    onDone(st === "pendiente" ? "Listo. El restaurante confirmará el cambio pronto." : "Listo, tu reservación quedó cambiada.");
  }

  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Fecha
          <Input type="date" className="mt-1" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="text-sm font-medium">Personas
          <div className="mt-1 flex h-10 items-center justify-between rounded-md border border-input px-2">
            <Button type="button" size="icon" variant="ghost" aria-label="Menos personas" disabled={party <= minParty} onClick={() => setParty((p) => Math.max(minParty, p - 1))}><Minus className="size-4" /></Button>
            <span aria-live="polite">{party}</span>
            <Button type="button" size="icon" variant="ghost" aria-label="Más personas" disabled={party >= maxParty} onClick={() => setParty((p) => Math.min(maxParty, p + 1))}><Plus className="size-4" /></Button>
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold">Elige la nueva hora</p>
      {slots.isLoading ? <p className="text-sm text-muted-foreground">Buscando horarios…</p> : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay mesas para {party} ese día. Prueba otra fecha.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((s) => (
            <Button key={s.starts_at} size="sm" disabled={busy} className="h-9 text-xs font-semibold" onClick={() => void choose(s)}>
              {formatTableTime(s.starts_at)}
            </Button>
          ))}
        </div>
      )}
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <Button variant="ghost" onClick={onClose}>Volver</Button>
    </div>
  );
}
