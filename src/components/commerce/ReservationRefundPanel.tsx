/**
 * ReservationRefundPanel.tsx
 *
 * Paso 8 del plan "Experiencias: la sección que vende en línea".
 *
 * Cancelación con reembolso de una reservación ya pagada (personal interno).
 * Devuelve los lugares al cupo de la salida y descuenta el importe del
 * estado de cuenta del anfitrión. No crea folios ni pantallas paralelas.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { refundConciergeReservation } from "@/lib/concierge/orders.functions";

const money = (value: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value / 100);

interface Props {
  orderId: string;
  folio: string;
  status: string;
  totalAmount: number;
  currency: string;
  paidAt: string | null;
  refund?: { amount?: number; reason?: string | null; at?: string } | null;
}

export function ReservationRefundPanel({
  orderId,
  folio,
  status,
  totalAmount,
  currency,
  paidAt,
  refund,
}: Props) {
  const queryClient = useQueryClient();
  const refundFn = useServerFn(refundConciergeReservation);
  const [openForm, setOpenForm] = useState(false);
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const pesos = partial.trim() ? Number(partial.replace(/[^\d.]/g, "")) : NaN;
      const amount = Number.isFinite(pesos) ? Math.round(pesos * 100) : undefined;
      return refundFn({ data: { orderId, reason: reason.trim(), amount } });
    },
    onSuccess: (res) => {
      toast.success(
        `Reembolso registrado en ${folio}` +
          (res.released ? ` · ${res.released} salida(s) devueltas al cupo` : ""),
      );
      setOpenForm(false);
      setReason("");
      setPartial("");
      void queryClient.invalidateQueries({ queryKey: ["concierge"] });
      void queryClient.invalidateQueries({ queryKey: ["concierge-reservation", orderId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "No se pudo registrar el reembolso.";
      toast.error(
        message.includes("pagadas")
          ? "Sólo se reembolsan reservaciones pagadas."
          : message.includes("autorizado")
            ? "Tu cuenta no puede registrar reembolsos."
            : message,
      );
    },
  });

  if (status === "refunded") {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-serif text-xl">Reembolso registrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se devolvieron {money(refund?.amount ?? totalAmount, currency)} al viajero
          {refund?.at
            ? ` el ${new Date(refund.at).toLocaleString("es-MX", { timeZone: "America/Merida", dateStyle: "medium", timeStyle: "short" })}`
            : ""}
          . Los lugares regresaron al cupo y el importe ya no se le liquida al anfitrión.
        </p>
        {refund?.reason ? (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Motivo: </span>
            {refund.reason}
          </p>
        ) : null}
      </section>
    );
  }

  if (!paidAt || !["paid", "fulfilled"].includes(status)) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Cancelar con reembolso</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Devuelve los lugares al cupo de la salida y descuenta el importe del estado de cuenta
            del anfitrión. La devolución del dinero se hace por el mismo medio de cobro.
          </p>
        </div>
        {!openForm ? (
          <Button variant="outline" onClick={() => setOpenForm(true)}>
            Registrar reembolso
          </Button>
        ) : null}
      </div>

      {openForm ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="refund-reason">
              Motivo (queda en la bitácora)
            </label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. El viajero canceló por cambio de vuelo."
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="refund-amount">
              Importe a devolver (vacío = total {money(totalAmount, currency)})
            </label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={partial}
              onChange={(event) => setPartial(event.target.value)}
              placeholder={(totalAmount / 100).toFixed(2)}
              className="mt-1 max-w-[220px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={reason.trim().length < 3 || mutation.isPending}
            >
              {mutation.isPending ? "Registrando…" : "Confirmar reembolso"}
            </Button>
            <Button variant="ghost" onClick={() => setOpenForm(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
