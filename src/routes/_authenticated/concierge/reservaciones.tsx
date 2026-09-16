import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listConciergeReservations, reservationPaymentLabel, type ReservationPaymentFilter } from "@/lib/concierge/orders.functions";

export const Route = createFileRoute("/_authenticated/concierge/reservaciones")({
  head: () => ({ meta: [
    { title: "Reservaciones | Centro Concierge" },
    { name: "description", content: "Reservaciones, pagos y seguimiento operativo del Centro Concierge." },
    { property: "og:title", content: "Reservaciones | Centro Concierge" },
    { property: "og:description", content: "Reservaciones, pagos y seguimiento operativo del Centro Concierge." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReservationsPage,
});

const statusLabels: Record<string, string> = { draft: "Borrador", awaiting_payment: "Por pagar", paid: "Pagada", fulfilled: "Realizada", cancelled: "Cancelada", refunded: "Reembolsada", expired: "Vencida" };
const money = (value: number, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);

function ReservationsPage() {
  const list = useServerFn(listConciergeReservations);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState<ReservationPaymentFilter>("all");
  const [source, setSource] = useState<"all" | "direct_sale" | "concierge_proposal">("all");
  const [destination, setDestination] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["concierge-reservations", search, status, payment, source, destination, fromDate, toDate, page], queryFn: () => list({ data: { search, status, payment, source, destination, fromDate: fromDate || undefined, toDate: toDate || undefined, page, pageSize: 50 } }) });
  const data = query.data;
  return <div className="space-y-6 pb-12">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">Central de operaciones</p><h1 className="mt-1 font-serif text-3xl">Reservaciones y pagos</h1><p className="mt-2 text-sm text-muted-foreground">ERL identifica experiencias en línea; AVL identifica viajes armados por Concierge.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de reservaciones">
      {[["Reservaciones", String(data?.totals.reservations ?? 0)], ["Efectivo cobrado", money(data?.totals.cash ?? 0)], ["En línea cobrado", money(data?.totals.online ?? 0)], ["Pendiente de cobro", money(data?.totals.pending ?? 0)]].map(([label,value]) => <article key={label} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></article>)}
    </section>
    <section className="space-y-3" aria-label="Filtros">
      <div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" placeholder="Buscar folio, viajero o destino" /></div>
      <div className="flex flex-wrap gap-2">
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={source} onChange={(e) => { setSource(e.target.value as typeof source); setPage(1); }}><option value="all">Todos los orígenes</option><option value="direct_sale">ERL · Experiencia en línea</option><option value="concierge_proposal">AVL · Arma tu viaje</option></select>
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={payment} onChange={(e) => { setPayment(e.target.value as ReservationPaymentFilter); setPage(1); }}><option value="all">Todas las formas de pago</option><option value="cash">Efectivo</option><option value="online">En línea</option><option value="unpaid">Sin pago</option></select>
        <Input className="w-52" value={destination} onChange={(e) => { setDestination(e.target.value); setPage(1); }} placeholder="Destino" />
        <label className="grid gap-1 text-xs text-muted-foreground">Desde<Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}/></label>
        <label className="grid gap-1 text-xs text-muted-foreground">Hasta<Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}/></label>
      </div>
    </section>
    <section className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">Folio</th><th className="p-3">Viajero</th><th className="p-3">Destino</th><th className="p-3">Estado</th><th className="p-3">Pago</th><th className="p-3 text-right">Importe</th></tr></thead><tbody>
        {query.isLoading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando reservaciones…</td></tr> : data?.rows.length ? data.rows.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><td className="p-3"><Link to="/concierge/reservaciones/$orderId" params={{ orderId: row.id }} className="font-mono font-semibold text-primary hover:underline">{row.folio}</Link><p className="mt-1 text-xs text-muted-foreground">{row.source_kind === "direct_sale" ? "Experiencia en línea" : "Arma tu viaje"}</p></td><td className="p-3">{row.traveler_name ?? "Sin nombre"}</td><td className="p-3">{row.destination_name ?? "Oriente Maya"}</td><td className="p-3">{statusLabels[row.status] ?? row.status}</td><td className="p-3">{reservationPaymentLabel(row.payment_provider, row.paid_at)}</td><td className="p-3 text-right font-mono">{money(row.total_amount, row.currency)}</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No hay reservaciones con estos filtros.</td></tr>}
      </tbody></table>
    </section>
    <footer className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{data?.total ?? 0} reservaciones</p><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button><Button variant="outline" disabled={!data || page * 50 >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button></div></footer>
  </div>;
}