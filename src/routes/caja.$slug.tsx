/**
 * /caja/$slug — pantalla de caja del restaurante: con un PIN (sin cuenta) el
 * cajero marca mesas ocupadas, llegadas sin reservación y mesas libres. Todo
 * cae en la misma agenda y bloquea la disponibilidad en línea al instante.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Minus, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { formatTableTime } from "@/lib/commerce/table-booking";
import {
  cashierTables, cashierTableState, isValidCashierPin,
  type CashierReservation, type CashierTable, type CashierTableState,
} from "@/lib/commerce/cashier";

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);

type Board = {
  name: string;
  floor_plan: CashierTable[];
  tables: { seats: number; count: number }[];
  reservations: CashierReservation[];
};

export const Route = createFileRoute("/caja/$slug")({
  head: () =>
    buildPublicHead({
      title: `Caja del restaurante · ${SITE.name}`,
      description: "Pantalla de caja para marcar mesas ocupadas y libres.",
      path: "/caja",
      noindex: true,
    }),
  component: CashierPage,
});

const tokenKey = (slug: string) => `vmx.caja.${slug}`;

function errorText(msg: string): string {
  if (msg.includes("locked")) return "Demasiados intentos. Espera 15 minutos.";
  if (msg.includes("no_pin")) return "Este restaurante aún no tiene PIN de caja. Pídelo al encargado.";
  if (msg.includes("table_taken")) return "Esa mesa ya está ocupada.";
  if (msg.includes("session_expired")) return "La sesión de caja terminó. Escribe el PIN otra vez.";
  return "No se pudo completar. Intenta de nuevo.";
}

function CashierPage() {
  const { slug } = Route.useParams();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(localStorage.getItem(tokenKey(slug)));
    setReady(true);
  }, [slug]);
  const save = (t: string | null) => {
    if (t) localStorage.setItem(tokenKey(slug), t);
    else localStorage.removeItem(tokenKey(slug));
    setToken(t);
  };
  if (!ready) return <div className="min-h-screen bg-background" />;
  return (
    <main className="min-h-screen bg-background text-foreground">
      {token ? <BoardView token={token} onExit={() => save(null)} /> : <PinForm slug={slug} onToken={save} />}
    </main>
  );
}

function PinForm({ slug, onToken }: { slug: string; onToken: (t: string) => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!isValidCashierPin(pin)) return setErr("El PIN tiene de 4 a 6 números.");
    setBusy(true); setErr(null);
    const { data, error } = await rpc("restaurant_cashier_login", { _slug: slug, _pin: pin });
    setBusy(false);
    if (error) return setErr(errorText(error.message));
    const r = data as { ok: boolean; token?: string };
    if (!r.ok || !r.token) { setPin(""); return setErr("PIN incorrecto."); }
    onToken(r.token);
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-xs flex-col justify-center gap-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Caja</p>
      <h1 className="text-2xl">Escribe el PIN de caja</h1>
      <Input
        inputMode="numeric" autoComplete="off" maxLength={6} value={pin} aria-label="PIN de caja"
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        className="h-14 text-center text-2xl tracking-[0.5em]"
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <Button className="h-12 rounded-pill" disabled={busy} onClick={() => void submit()}>Entrar</Button>
    </div>
  );
}

function BoardView({ token, onExit }: { token: string; onExit: () => void }) {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [picked, setPicked] = useState<CashierTable | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(i); }, []);
  const q = useQuery({
    queryKey: ["caja", token],
    queryFn: async () => {
      const { data, error } = await rpc("restaurant_cashier_board", { _token: token });
      if (error) throw new Error(error.message);
      return data as Board;
    },
    refetchInterval: 15_000,
    retry: false,
  });
  useEffect(() => { if (q.error && String(q.error.message).includes("session_expired")) onExit(); }, [q.error, onExit]);
  const tables = useMemo(() => (q.data ? cashierTables(q.data.floor_plan, q.data.tables) : []), [q.data]);

  const act = async (fn: string, args: Record<string, unknown>) => {
    setErr(null);
    const { error } = await rpc(fn, { _token: token, ...args });
    if (error) setErr(errorText(error.message));
    setPicked(null);
    await qc.invalidateQueries({ queryKey: ["caja", token] });
  };

  if (q.isLoading || !q.data) return <p className="p-6 text-sm text-muted-foreground">Cargando mesas…</p>;
  const states = tables.map((t) => ({ t, s: cashierTableState(t, q.data.reservations, now) }));
  const free = states.filter((x) => x.s.kind === "libre").length;
  const upcoming = q.data.reservations.filter((r) => ["pendiente", "confirmada", "llego"].includes(r.status) && !r.table_id);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Caja</p>
          <h1 className="text-xl">{q.data.name}</h1>
          <p className="text-sm text-muted-foreground">{free} de {tables.length} mesas libres</p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" aria-label="Actualizar" onClick={() => void q.refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" aria-label="Salir" onClick={onExit}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>
      {err ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {states.map(({ t, s }) => (
          <button
            key={t.id} type="button" onClick={() => setPicked(t)}
            className={`min-h-24 rounded-xl border p-3 text-left transition ${tone(s)}`}
          >
            <span className="block font-semibold">{t.label}</span>
            <span className="block text-xs opacity-80">{t.seats} lugares · {t.zone}</span>
            <span className="mt-2 block text-sm font-medium">{label(s)}</span>
          </button>
        ))}
      </div>

      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Reservas de hoy sin mesa</h2>
          {upcoming.map((r) => (
            <p key={r.id} className="rounded-lg border border-border p-2 text-sm">
              {formatTableTime(r.starts_at)} · {r.guest} · {r.party_size} personas
            </p>
          ))}
        </section>
      ) : null}

      {picked ? (
        <TableSheet
          table={picked}
          state={cashierTableState(picked, q.data.reservations, now)}
          waiting={upcoming}
          onClose={() => setPicked(null)}
          onSeat={(party) => void act("restaurant_cashier_seat", { _table_id: picked.id, _party: party })}
          onArrive={(id) => void act("restaurant_cashier_set", { _reservation_id: id, _action: "sentar", _table_id: picked.id })}
          onFree={(id) => void act("restaurant_cashier_set", { _reservation_id: id, _action: "liberar" })}
        />
      ) : null}
    </div>
  );
}

function tone(s: CashierTableState): string {
  if (s.kind === "ocupada") return "border-destructive/50 bg-destructive/10";
  if (s.kind === "reservada") return "border-warning/60 bg-warning/15";
  return "border-success/50 bg-success/10";
}
function label(s: CashierTableState): string {
  if (s.kind === "ocupada") return `Ocupada · ${s.reservation.party_size} pers.`;
  if (s.kind === "reservada") return `Reservada ${formatTableTime(s.reservation.starts_at)} · ${s.reservation.guest}`;
  return "Libre";
}

function TableSheet(props: {
  table: CashierTable; state: CashierTableState; waiting: CashierReservation[];
  onClose: () => void; onSeat: (party: number) => void; onArrive: (id: string) => void; onFree: (id: string) => void;
}) {
  const { table, state } = props;
  const [party, setParty] = useState(Math.min(2, table.seats));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" onClick={props.onClose}>
      <div className="w-full max-w-sm space-y-3 rounded-t-2xl bg-background p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">{table.label}</h2>
        {state.kind === "ocupada" ? (
          <Button className="h-12 w-full rounded-pill" onClick={() => props.onFree(state.reservation.id)}>Liberar mesa (cuenta cerrada)</Button>
        ) : (
          <>
            {state.kind === "reservada" ? (
              <Button className="h-12 w-full rounded-pill" onClick={() => props.onArrive(state.reservation.id)}>
                Llegó {state.reservation.guest} ({state.reservation.party_size})
              </Button>
            ) : null}
            <p className="text-sm font-medium">Llegó sin reservación</p>
            <div className="flex items-center justify-center gap-4">
              <Button size="icon" variant="outline" aria-label="Menos personas" onClick={() => setParty((p) => Math.max(1, p - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-16 text-center text-2xl font-semibold">{party}</span>
              <Button size="icon" variant="outline" aria-label="Más personas" onClick={() => setParty((p) => Math.min(60, p + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button variant={state.kind === "reservada" ? "outline" : "default"} className="h-12 w-full rounded-pill" onClick={() => props.onSeat(party)}>
              Ocupar con {party} personas
            </Button>
            {state.kind === "libre" && props.waiting.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">O sentar una reserva de hoy</p>
                {props.waiting.slice(0, 4).map((r) => (
                  <Button key={r.id} variant="outline" className="w-full justify-start" onClick={() => props.onArrive(r.id)}>
                    {formatTableTime(r.starts_at)} · {r.guest} · {r.party_size}
                  </Button>
                ))}
              </div>
            ) : null}
          </>
        )}
        <Button variant="ghost" className="w-full" onClick={props.onClose}>Cerrar</Button>
      </div>
    </div>
  );
}
