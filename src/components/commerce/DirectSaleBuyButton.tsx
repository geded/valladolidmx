/**
 * DirectSaleBuyButton — Botón "Comprar ahora" para experiencias con
 * venta directa activada (CV4.1). Se muestra siempre; permanece
 * deshabilitado hasta que la plataforma de pagos esté configurada
 * (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET) y activada
 * (PAYMENTS_ENABLED != "false"). El checkout definitivo se conecta en
 * la siguiente ola CV4.2.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPaymentsReadyPublic } from "@/lib/payments/public-status.functions";

export function DirectSaleBuyButton({
  productName,
  priceLabel,
  className,
}: {
  productName?: string;
  priceLabel?: string;
  className?: string;
}) {
  const fetchStatus = useServerFn(getPaymentsReadyPublic);
  const { data } = useQuery({
    queryKey: ["payments", "public-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });
  const ready = data?.ready ?? false;

  return (
    <Button
      type="button"
      disabled={!ready}
      title={
        ready
          ? undefined
          : "El botón Comprar estará activo cuando la plataforma de pagos se active."
      }
      onClick={() => {
        if (!ready) return;
        toast.info(
          `Preparando el pago de ${productName ?? "esta experiencia"}${
            priceLabel ? ` · ${priceLabel}` : ""
          }…`,
        );
      }}
      className={className}
    >
      {ready ? "Comprar ahora" : "Comprar · próximamente"}
    </Button>
  );
}