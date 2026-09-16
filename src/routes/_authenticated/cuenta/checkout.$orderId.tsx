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
import { useState } from "react";
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
import { getPaymentsReadyPublic } from "@/lib/payments/public-status.functions";

export const Route = createFileRoute("/_authenticated/cuenta/checkout/$orderId")({
  component: CheckoutPage,
});

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

  const [busy, setBusy] = useState(false);

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
      await notifyConfirmed(order);
      try {
        await notifyAdmin({ data: { orderId } });
      } catch {
        // El aviso interno puede reintentarse; no bloquea la confirmación.
      }
      await orderQ.refetch();
      toast.success("Viaje confirmado — te esperamos en el Oriente Maya");
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
      const result = await startOnlinePayment({ data: { orderId, clientRequestId: crypto.randomUUID() } });
      if (result.mode === "redirect" && result.redirectUrl) window.location.assign(result.redirectUrl);
      else throw new Error("No se pudo abrir el pago en línea");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
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
        <h2 className="font-serif text-xl">Tu itinerario</h2>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{it.title}</p>
                {it.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
                ) : null}
                {it.quantity > 1 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Cantidad: {it.quantity}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{money(it.subtotal_amount, it.currency)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Total del viaje</span>
          <span className="font-serif text-2xl">{money(order.total_amount, order.currency)}</span>
        </div>
      </section>

      {isFinal ? (
        <section className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
          <p className="text-sm">
            Estado del viaje:{" "}
            <Badge variant="outline" className="ml-1 uppercase">
              {order.status}
            </Badge>
          </p>
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
      ) : (
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-serif text-lg">Confirmemos tu viaje</h3>
          <p className="mt-2 text-sm text-foreground/80">
            Al confirmar reservamos tu experiencia con los anfitriones seleccionados y activamos el
            acompañamiento de tu concierge para los siguientes pasos.
          </p>
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Forma de pago
            </p>
            <div className="rounded-md border border-primary/40 bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Efectivo con tu concierge</span>
                <Badge variant="outline" className="text-[10px] uppercase">
                  Disponible
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Al confirmar queda registrado el pago de tu viaje y se abre tu itinerario con el
                acompañamiento de Alux.
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
            <Button onClick={handleOnlinePayment} disabled={busy || !paymentsQ.data?.ready} size="lg">
              {busy ? "Abriendo pago…" : "Pagar en línea"}
            </Button>
            <Button onClick={handleConfirm} disabled={busy} size="lg">
              {busy ? "Confirmando…" : "Confirmar mi viaje (pago en efectivo)"}
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
