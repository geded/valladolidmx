/**
 * /cuenta/historial — Historial de órdenes (Ola 4 · Etapa 4b).
 * Lectura vía server fn protegida; cancelación idempotente.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelOrder,
  listMyOrders,
  type OrderStatus,
  type OrderSummary,
} from "@/lib/catalog/cart.functions";
import { startPayment } from "@/lib/payments/payments.functions";

function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface HistorialSearch {
  highlight?: string;
}

export const Route = createFileRoute("/_authenticated/cuenta/historial")({
  validateSearch: (s: Record<string, unknown>): HistorialSearch => ({
    highlight: typeof s.highlight === "string" ? s.highlight : undefined,
  }),
  component: HistorialPage,
});

const STATUS_LABEL: Record<OrderStatus, string> = {
  cart: "Carrito",
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  fulfilled: "Cumplida",
};

function HistorialPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listMyOrders);
  const cancel = useServerFn(cancelOrder);
  const pay = useServerFn(startPayment);
  const { highlight } = Route.useSearch();

  const { data, isLoading, error } = useQuery({
    queryKey: ["traveler", "orders", user?.id],
    queryFn: () => fetchOrders(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (order_id: string) => cancel({ data: { order_id } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["traveler", "orders", user?.id] }),
  });

  const payMutation = useMutation({
    mutationFn: (order_id: string) =>
      pay({ data: { order_id, client_request_id: genId() } }),
    onSuccess: (res) => {
      if (res.mode === "redirect" && res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    },
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Historial</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tus órdenes confirmadas, pendientes y canceladas. El cobro se
        habilitará en la siguiente etapa.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-destructive">
          No pudimos cargar tu historial: {String((error as Error).message)}
        </p>
      ) : !data || data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Aún no tienes órdenes. Cuando confirmes una reserva aparecerá
            aquí.
          </p>
          <Link
            to="/cuenta/carrito"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ver mi carrito
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.map((order: OrderSummary) => {
            const isHighlighted = highlight === order.id;
            const cancellable = order.status === "pending" || order.status === "confirmed";
            return (
              <li
                key={order.id}
                className={[
                  "rounded-2xl border bg-card p-4",
                  isHighlighted ? "border-primary ring-2 ring-primary/30" : "border-border",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Orden {order.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {STATUS_LABEL[order.status]} ·{" "}
                      <span className="tabular-nums">
                        {order.currency} {order.total_amount.toFixed(2)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  {cancellable ? (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(order.id)}
                      disabled={cancelMutation.isPending}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  ) : null}
                  {(order.status === "pending" || order.status === "confirmed") &&
                  order.payment_status !== "paid" &&
                  order.payment_status !== "refunded" ? (
                    <button
                      type="button"
                      onClick={() => payMutation.mutate(order.id)}
                      disabled={payMutation.isPending}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {payMutation.isPending ? "Procesando…" : "Pagar"}
                    </button>
                  ) : null}
                  {order.payment_status === "paid" ? (
                    <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Pagada
                    </span>
                  ) : null}
                </div>
                {order.items.length > 0 ? (
                  <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    {order.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-3">
                        <span className="truncate">
                          {it.quantity} × {it.snapshot_name}
                        </span>
                        <span className="tabular-nums">
                          {it.currency} {it.line_total.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}