import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { getConciergeReservation } from "@/lib/concierge/orders.functions";

export const Route = createFileRoute("/_authenticated/concierge/reservaciones/$orderId")({
  head: () => ({ meta: [
    { title: "Detalle de reservación | Centro Concierge" },
    { name: "description", content: "Detalle operativo, partidas y bitácora de pago de una reservación." },
    { property: "og:title", content: "Detalle de reservación | Centro Concierge" },
    { property: "og:description", content: "Detalle operativo, partidas y bitácora de pago de una reservación." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: ReservationDetailPage,
});
const money = (value: number, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value / 100);
const eventLabels: Record<string,string> = { payment_initiated: "Cobro en línea iniciado", payment_succeeded: "Pago confirmado", payment_failed: "Pago no completado", paid_demo: "Pago de demostración", cancelled_by_traveler: "Cancelada por el viajero" };
function ReservationDetailPage() {
  const { orderId } = Route.useParams(); const getReservation = useServerFn(getConciergeReservation);
  const query = useQuery({ queryKey: ["concierge-reservation", orderId], queryFn: () => getReservation({ data: { orderId } }) });
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Cargando reservación…</p>;
  if (!query.data) return <p>No se encontró la reservación.</p>;
  const { order, items, events } = query.data;
  const booking = query.data.booking ?? [];
  return <div className="max-w-5xl space-y-6 pb-12"><Link to="/concierge/reservaciones" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>Reservaciones</Link>
    <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">{order.source_kind === "direct_sale" ? "Experiencia · Reserva en línea" : "Arma tu viaje"}</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><h1 className="font-serif text-3xl">{order.folio}</h1><p className="font-serif text-2xl">{money(order.total_amount, order.currency)}</p></div><p className="mt-2 text-sm text-muted-foreground">{order.traveler_name ?? "Viajero sin nombre"} · {order.destination_name ?? "Oriente Maya"}</p></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Estado", order.status], ["Forma de pago", order.paid_at ? order.payment_provider === "cash" ? "Efectivo" : "En línea" : "Sin pago"], ["Fecha de cobro", order.paid_at ? new Date(order.paid_at).toLocaleString("es-MX", { timeZone: "America/Merida", dateStyle: "medium", timeStyle: "short" }) : "Pendiente"], ["Contacto", order.traveler_email ?? order.traveler_phone ?? "No disponible"]].map(([label,value]) => <article key={label} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></article>)}</section>
    <section><h2 className="font-serif text-2xl">Servicios reservados</h2><div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 p-4"><div><p className="font-medium">{item.title}</p>{item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}<p className="mt-1 text-xs text-muted-foreground">Cantidad: {item.quantity}</p></div><p className="font-mono text-sm">{money(item.subtotal_amount, item.currency)}</p></div>)}</div></section>
    <section><h2 className="font-serif text-2xl">Bitácora de pago</h2><ol className="mt-3 space-y-3 border-l border-border pl-5">{events.map((event) => <li key={event.id}><p className="text-sm font-semibold">{eventLabels[event.event_type] ?? event.event_type}</p><time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("es-MX", { timeZone: "America/Merida", dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ol></section>
  </div>;
}