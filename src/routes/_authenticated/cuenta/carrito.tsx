/**
 * /cuenta/carrito — Carrito del viajero (Ola 4 · Etapa 4b).
 * Lectura/mutación vía server fns con `requireSupabaseAuth`; RPC
 * `SECURITY DEFINER` aplica idempotencia y validación server-side.
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmOrder,
  getMyCart,
  removeFromCart,
  updateCartQty,
  type CartItem,
  type OrderSummary,
} from "@/lib/catalog/cart.functions";

export const Route = createFileRoute("/_authenticated/cuenta/carrito")({
  component: CarritoPage,
});

function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CarritoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchCart = useServerFn(getMyCart);
  const updateQty = useServerFn(updateCartQty);
  const removeItem = useServerFn(removeFromCart);
  const confirm = useServerFn(confirmOrder);

  const [requestId] = useState(() => genId());
  const [notes, setNotes] = useState("");

  const { data: cart, isLoading } = useQuery({
    queryKey: ["traveler", "cart", user?.id],
    queryFn: () => fetchCart(),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["traveler", "cart", user?.id] });

  const qtyMutation = useMutation({
    mutationFn: (input: { item_id: string; quantity: number }) =>
      updateQty({ data: input }),
    onSuccess: () => void invalidate(),
  });
  const removeMutation = useMutation({
    mutationFn: (item_id: string) => removeItem({ data: { item_id } }),
    onSuccess: () => void invalidate(),
  });
  const confirmMutation = useMutation({
    mutationFn: () =>
      confirm({
        data: {
          client_request_id: requestId,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: (order: OrderSummary) => {
      void queryClient.invalidateQueries({ queryKey: ["traveler", "cart", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["traveler", "orders", user?.id] });
      void navigate({
        to: "/cuenta/historial",
        search: { highlight: order.id } as never,
      });
    },
  });

  const items = cart?.items ?? [];
  const isEmpty = !cart || items.length === 0;

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Mi carrito</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Revisa, ajusta y confirma tus reservas. La confirmación crea una
        orden pendiente; el cobro se habilita en una etapa posterior.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Tu carrito está vacío. Explora el Marketplace para añadir
            experiencias.
          </p>
          <Link
            to="/oriente-maya"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ir al Marketplace
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-3">
            {items.map((item: CartItem) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.snapshot_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.currency} {item.unit_price.toFixed(2)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Cant.</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={item.quantity}
                      onBlur={(e) => {
                        const q = Math.max(1, Math.min(99, Math.floor(Number(e.target.value || 1))));
                        if (q !== item.quantity) {
                          qtyMutation.mutate({ item_id: item.id, quantity: q });
                        }
                      }}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </label>
                  <p className="text-sm font-medium tabular-nums">
                    {item.currency} {item.line_total.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(item.id)}
                    disabled={removeMutation.isPending}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {cart!.currency} {cart!.subtotal_amount.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {cart!.currency} {cart!.total_amount.toFixed(2)}
                </dd>
              </div>
            </dl>
            <label className="mt-4 block text-sm">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notas para la empresa (opcional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            {confirmMutation.error ? (
              <p className="mt-3 text-sm text-destructive">
                {String((confirmMutation.error as Error).message)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {confirmMutation.isPending ? "Confirmando…" : "Confirmar reserva"}
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Al confirmar, tu carrito pasa a estado <strong>pendiente</strong>.
              El cobro se habilitará en la siguiente etapa.
            </p>
          </section>
        </>
      )}
    </div>
  );
}