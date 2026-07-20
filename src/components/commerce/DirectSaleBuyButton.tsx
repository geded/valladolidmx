/**
 * DirectSaleBuyButton — Botón "Comprar ahora" para experiencias con
 * venta directa activada (CV4.1). Se muestra siempre; permanece
 * deshabilitado hasta que la plataforma de pagos esté configurada
 * (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET) y activada
 * (PAYMENTS_ENABLED != "false"). El checkout definitivo se conecta en
 * la siguiente ola CV4.2.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getPaymentsReadyPublic } from "@/lib/payments/public-status.functions";
import { createDirectSaleOrder } from "@/lib/concierge/orders.functions";

export function DirectSaleBuyButton({
  productId,
  productName,
  priceLabel,
  className,
  quantity = 1,
}: {
  productId?: string;
  productName?: string;
  priceLabel?: string;
  className?: string;
  quantity?: number;
}) {
  const fetchStatus = useServerFn(getPaymentsReadyPublic);
  const createOrder = useServerFn(createDirectSaleOrder);
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["payments", "public-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });
  const ready = data?.ready ?? false;
  const demoMode = data?.demoMode ?? true;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"review" | "confirming" | "done">("review");

  const disabled = !ready && !demoMode;
  const label = ready
    ? "Comprar ahora"
    : demoMode
      ? "Comprar (demo)"
      : "Comprar · próximamente";

  function handleClick() {
    if (disabled) return;
    setStep("review");
    setOpen(true);
  }

  async function handleConfirm() {
    // Flujo real: crea la orden y navega al checkout narrativo (CV4.2).
    if (productId) {
      setStep("confirming");
      try {
        const { orderId } = await createOrder({
          data: { productId, quantity },
        });
        setOpen(false);
        setStep("review");
        navigate({ to: "/cuenta/checkout/$orderId", params: { orderId } });
      } catch (err) {
        setStep("review");
        toast.error(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la confirmación",
        );
      }
      return;
    }
    // Vista previa sin productId (p.ej. panel del empresario): simulación.
    setStep("confirming");
    setTimeout(() => {
      setStep("done");
      toast.success(
        `Compra demo registrada — ${productName ?? "experiencia"}${
          priceLabel ? ` · ${priceLabel}` : ""
        }`,
      );
    }, 500);
  }

  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        title={
          disabled
            ? "Se activará cuando la plataforma de pagos esté configurada."
            : undefined
        }
        onClick={handleClick}
        className={className}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Confirmar compra</DialogTitle>
              {!ready ? (
                <Badge variant="outline" className="text-[10px] uppercase">
                  Demo
                </Badge>
              ) : null}
            </div>
            <DialogDescription>
              {productName ?? "Experiencia"}
              {priceLabel ? ` · ${priceLabel}` : ""}
            </DialogDescription>
          </DialogHeader>

          {step === "review" ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="font-medium">Resumen</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>· 1 reserva de {productName ?? "experiencia"}</li>
                  <li>· Precio total: {priceLabel ?? "—"}</li>
                  <li>· Cancelación según política del anfitrión</li>
                </ul>
              </div>
              {!ready ? (
                <p className="text-[11px] text-amber-700">
                  Esta compra es simulada. No se cobrará y sirve para probar
                  el flujo antes de conectar el proveedor real.
                </p>
              ) : null}
            </div>
          ) : step === "confirming" ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Procesando…
            </p>
          ) : (
            <div className="space-y-2 py-4 text-center text-sm">
              <p className="text-2xl">✓</p>
              <p className="font-medium">
                {ready ? "Pago iniciado" : "Compra demo confirmada"}
              </p>
              <p className="text-xs text-muted-foreground">
                Folio ficticio: VMX-{Math.random().toString(36).slice(2, 8).toUpperCase()}
                {!ready ? "-DEMO" : ""}
              </p>
            </div>
          )}

          <DialogFooter>
            {step === "review" ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirm}>
                  {ready ? "Pagar ahora" : "Confirmar compra demo"}
                </Button>
              </>
            ) : step === "done" ? (
              <Button onClick={() => setOpen(false)}>Cerrar</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}