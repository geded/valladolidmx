/**
 * /cuenta/checkout/$orderId — CV4.2 · Checkout narrativo
 *
 * Confirmación editorial del viaje. Evita el lenguaje transaccional
 * ("pago", "orden", "cliente"): el viajero está confirmando el viaje
 * que armó junto a Alux y su concierge para descubrir el Oriente Maya
 * de Yucatán.
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  readCheckoutOrigin,
  settleCheckoutOrigin,
  type CheckoutOrigin,
} from "@/lib/navigation/session-context";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  getConciergeOrder,
  markConciergeOrderPaidCash,
  startConciergeOnlinePayment,
  cancelConciergeOrder,
  type ConciergeOrderView,
} from "@/lib/concierge/orders.functions";
import { notifyAdminBookingPaid } from "@/lib/concierge/booking-admin-notify.functions";
import { getOrderBooking } from "@/lib/commerce/booking.functions";
import { getPaymentsReadyPublic } from "@/lib/payments/public-status.functions";

export const Route = createFileRoute("/_authenticated/cuenta/checkout/$orderId")({
  component: CheckoutPage,
});

function stayDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1),
  );
}

function money(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();

  const fetchOrder = useServerFn(getConciergeOrder);
  const payCash = useServerFn(markConciergeOrderPaidCash);
  const cancelOrder = useServerFn(cancelConciergeOrder);
  const startOnlinePayment = useServerFn(startConciergeOnlinePayment);
  const fetchPaymentsReady = useServerFn(getPaymentsReadyPublic);
  const notifyAdmin = useServerFn(notifyAdminBookingPaid);

  const orderQ = useQuery({
    queryKey: ["concierge-order", orderId],
    queryFn: () => fetchOrder({ data: { orderId } }),
  });
  const paymentsQ = useQuery({ queryKey: ["payments-ready"], queryFn: () => fetchPaymentsReady() });
  const fetchBooking = useServerFn(getOrderBooking);
  const bookingQ = useQuery({
    queryKey: ["order-booking", orderId],
    queryFn: () => fetchBooking({ data: { orderId } }),
  });

  const [busy, setBusy] = useState(false);
  // Página de la empresa o ficha desde la que se abrió (Copalli, hotel…).
  const [origin, setOrigin] = useState<CheckoutOrigin | null>(null);
  useEffect(() => setOrigin(readCheckoutOrigin(orderId)), [orderId]);
  const orderStatus = orderQ.data?.status;
  useEffect(() => {
    if (orderStatus === "paid" || orderStatus === "fulfilled") settleCheckoutOrigin(orderId);
  }, [orderStatus, orderId]);
  const originLink = origin ? (
    <Link
      to={origin.path}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {origin.label}
    </Link>
  ) : null;

  if (orderQ.isLoading) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-muted-foreground">Preparando tu viaje…</p>
      </div>
    );
  }

  if (orderQ.isError || !orderQ.data) {
    return (
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Oriente Maya de Yucatán
        </p>
        <h1 className="mt-2 text-4xl">No pudimos abrir este viaje</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Es posible que el viaje ya no esté disponible o que el enlace haya caducado. Vuelve a tu
          recorrido y ábrelo desde ahí.
        </p>
        <Link
          to="/cuenta/mi-viaje"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ir a mi viaje
        </Link>
      </div>
    );
  }

  const order: ConciergeOrderView = orderQ.data;
  // Tienda y pedidos para recoger: mismo flujo, palabras de pedido.
  const pickup = order.pickup === true;
  // Hoteles: el viajero paga solo cuando el hotel confirma.
  const stay = order.stay ?? null;
  const stayWaiting = stay?.status === "pending_host" && order.status === "draft";
  const stayExpired =
    stayWaiting && stay?.confirmBy ? new Date(stay.confirmBy).getTime() <= Date.now() : false;

  const isFinal =
    order.status === "paid" ||
    order.status === "fulfilled" ||
    order.status === "cancelled" ||
    order.status === "expired" ||
    order.status === "refunded";

  async function notifyConfirmed(current: ConciergeOrderView) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.trim();
      if (!email) return;
      await sendTransactionalEmail({
        templateName: "trip-confirmed",
        recipientEmail: email,
        idempotencyKey: `trip-confirmed-${orderId}`,
        templateData: {
          travelerName:
            (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? undefined,
          folio: current.folio,
          totalLabel: money(current.total_amount, current.currency),
          destinationName: current.destination_name ?? undefined,
          itinerary: current.items.map((it) => it.title).slice(0, 12),
        },
      });
    } catch {
      // El viaje ya quedó confirmado; el correo puede reintentarse después.
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      // Modalidad vigente: pago en efectivo con el concierge.
      await payCash({ data: { orderId, note: null } });
      settleCheckoutOrigin(orderId);
      await notifyConfirmed(order);
      try {
        await notifyAdmin({ data: { orderId } });
      } catch {
        // El aviso interno puede reintentarse; no bloquea la confirmación.
      }
      await orderQ.refetch();
      toast.success("Reserva apartada — el concierge confirma al recibir tu pago en efectivo");
      navigate({
        to: "/cuenta/pagos/exito",
        search: { order: orderId },
      });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocurrió un problema";
      toast.error(message);
      navigate({ to: "/cuenta/pagos/error", search: { order: orderId } });
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("¿Quieres cancelar esta confirmación de viaje?")) return;
    setBusy(true);
    try {
      await cancelOrder({ data: { orderId, reason: null } });
      await orderQ.refetch();
      toast.message("Viaje cancelado", {
        description: "Puedes retomarlo cuando quieras desde tu recorrido.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setBusy(false);
    }
  }

  async function handleOnlinePayment() {
    setBusy(true);
    try {
      const result = await startOnlinePayment({
        data: { orderId, clientRequestId: crypto.randomUUID() },
      });
      if (result.mode === "redirect" && result.redirectUrl)
        window.location.assign(result.redirectUrl);
      else throw new Error("No se pudo abrir el pago en línea");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {originLink}
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Oriente Maya de Yucatán
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl">{order.editorial_title ?? "Tu viaje está listo"}</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary">
          Folio {order.folio}
        </span>
      </div>

      {order.editorial_summary ? (
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/80">
          {order.editorial_summary}
        </p>
      ) : (
        <p className="mt-3 text-base leading-relaxed text-foreground/80">
          Todo lo que armaste con Alux y tu concierge está listo. Al confirmar reservamos tu
          experiencia y avisamos a los anfitriones en el destino.
        </p>
      )}

      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="font-serif text-xl">{stay ? "Tu estancia" : pickup ? "Tu pedido" : "Tu itinerario"}</h2>
        {stay ? (
          <p className="mt-2 text-sm text-foreground/80">
            Llegada {stayDay(stay.checkIn)} · Salida {stayDay(stay.checkOut)} · {stay.nights}{" "}
            {stay.nights === 1 ? "noche" : "noches"} · {stay.guests} {stay.guests === 1 ? "huésped" : "huéspedes"}
          </p>
        ) : null}
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{it.title}</p>
                {it.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
                ) : null}
                {it.quantity > 1 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stay ? `Noches: ${it.quantity}` : `Cantidad: ${it.quantity}`}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{money(it.subtotal_amount, it.currency)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">
            {stay ? "Total de la estancia" : pickup ? "Total del pedido" : "Total del viaje"}
          </span>
          <span className="font-serif text-2xl">{money(order.total_amount, order.currency)}</span>
        </div>
      </section>

      {(bookingQ.data ?? []).length > 0 ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="font-serif text-xl">Fecha y lugares apartados</h2>
          <ul className="mt-3 space-y-3">
            {(bookingQ.data ?? []).map((b) => (
              <li key={b.hold_id} className="text-sm">
                <p className="font-medium">
                  {new Intl.DateTimeFormat("es-MX", {
                    timeZone: b.timezone,
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(b.starts_at))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.product_name} · {b.quantity} {b.quantity === 1 ? "persona" : "personas"} ·{" "}
                  {b.status === "confirmed"
                    ? "Lugares confirmados"
                    : `Lugares apartados hasta las ${new Intl.DateTimeFormat("es-MX", {
                        timeZone: b.timezone,
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(b.expires_at))}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isFinal ? (
        <section className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
          <p className="text-sm">
            Estado del viaje:{" "}
            <Badge variant="outline" className="ml-1 uppercase">
              {order.status}
            </Badge>
          </p>
          {stay?.status === "declined" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              El hotel no pudo confirmar esas fechas
              {stay.hostNote ? `: «${stay.hostNote}»` : "."} Las noches quedaron libres; tu concierge te ayuda
              a encontrar otra opción.
            </p>
          ) : null}
          {order.status === "paid" || order.status === "fulfilled" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Tu viaje está confirmado. Puedes ver los detalles y comprobante en tu historial.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/cuenta/historial"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Ver mi historial
            </Link>
            <Link
              to="/cuenta/mi-viaje"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Volver a mi viaje
            </Link>
          </div>
        </section>
      ) : stayWaiting ? (
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-serif text-lg">
            {stayExpired ? "El hotel no respondió a tiempo" : "Esperando la confirmación del hotel"}
          </h3>
          <p className="mt-2 text-sm text-foreground/80">
            {stayExpired
              ? "Las noches ya no están apartadas. Tu concierge te ayuda a buscar otra opción, o puedes intentarlo con otras fechas."
              : `Te apartamos las noches hasta el ${
                  stay?.confirmBy
                    ? new Intl.DateTimeFormat("es-MX", {
                        timeZone: "America/Merida",
                        weekday: "long",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(stay.confirmBy))
                    : ""
                } (hora de Valladolid). En cuanto el hotel confirme te avisamos y aquí mismo podrás pagar.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => void orderQ.refetch()} disabled={busy}>
              Revisar de nuevo
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={busy}>
              Cancelar solicitud
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-serif text-lg">
            {stay ? "El hotel confirmó tu reserva" : pickup ? "Confirma tu pedido" : "Confirmemos tu viaje"}
          </h3>
          <p className="mt-2 text-sm text-foreground/80">
            {stay
              ? "Elige cómo pagar para dejar tu estancia lista. Muestra tu folio al llegar al hotel."
              : pickup
              ? "Al confirmar avisamos a la empresa para que lo prepare. Lo recoges en el local mostrando tu folio."
              : "Al confirmar reservamos tu experiencia con los anfitriones seleccionados y activamos el acompañamiento de tu concierge para los siguientes pasos."}
          </p>
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Forma de pago
            </p>
            <div className="rounded-md border border-primary/40 bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {stay ? "Efectivo al llegar" : pickup ? "Efectivo al recoger" : "Efectivo con tu concierge"}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  Disponible
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stay
                  ? "Pagas en el hotel al llegar."
                  : pickup
                  ? "Pagas en el local cuando pases por tu pedido."
                  : "Al confirmar queda registrado el pago de tu viaje y se abre tu itinerario con el acompañamiento de Alux."}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Pagar con tarjeta</span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {paymentsQ.data?.ready ? "Disponible" : "En preparación"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {paymentsQ.data?.ready
                  ? "Paga en línea de forma segura. Tu reservación se confirma automáticamente al aprobarse el cobro."
                  : "El cobro en línea se activará cuando el proveedor de pagos termine su configuración."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={handleOnlinePayment}
              disabled={busy || !paymentsQ.data?.ready}
              size="lg"
            >
              {busy ? "Abriendo pago…" : "Pagar en línea"}
            </Button>
            <Button onClick={handleConfirm} disabled={busy} size="lg">
              {busy
                ? "Confirmando…"
                : stay
                  ? "Confirmar reserva (pago al llegar)"
                  : pickup
                  ? "Confirmar pedido (pago al recoger)"
                  : "Confirmar mi viaje (pago en efectivo)"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
