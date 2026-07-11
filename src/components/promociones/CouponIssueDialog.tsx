/**
 * CouponIssueDialog — Ola 2 · desbloqueo del cupón para viajero elegible.
 *
 * Se abre al hacer click en una tarjeta de promoción cuando el viajero
 * tiene perfil público al 100%. Emite (o recupera) el cupón, muestra el
 * código y el QR sin sacar al usuario del listado.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Ticket, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  issueCoupon,
  type TravelerCoupon,
} from "@/lib/promotions/coupons.functions";
import { CouponQR } from "./CouponQR";
import { sendTransactionalEmail } from "@/lib/email/send";
import { supabase } from "@/integrations/supabase/client";

export function CouponIssueDialog({
  open,
  onOpenChange,
  promotionSlug,
  promotionTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promotionSlug: string | null;
  promotionTitle: string | null;
}) {
  const issue = useServerFn(issueCoupon);
  const queryClient = useQueryClient();
  const [coupon, setCoupon] = useState<TravelerCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !promotionSlug) return;
    setCoupon(null);
    setError(null);
    setLoading(true);
    issue({ data: { promotion_slug: promotionSlug } })
      .then((c) => {
        setCoupon(c);
        queryClient.invalidateQueries({ queryKey: ["my-coupons"] });
        // Email de confirmación (idempotente por coupon.id — no duplica en reintentos).
        void (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) return;
            const origin =
              typeof window !== "undefined" ? window.location.origin : "";
            await sendTransactionalEmail({
              templateName: "coupon-issued",
              recipientEmail: user.email,
              idempotencyKey: `coupon-issued-${c.id}`,
              templateData: {
                travelerName:
                  (user.user_metadata as { first_name?: string } | null)
                    ?.first_name ?? null,
                title: c.title,
                code: c.code,
                discountPercent: c.discount_percent,
                businessName: c.business_name ?? null,
                validUntil: c.valid_until,
                terms: c.terms,
                couponUrl: `${origin}/cuenta/mis-cupones`,
              },
            });
          } catch (err) {
            console.warn("[coupon-issued email] send failed", err);
          }
        })();
      })
      .catch((e: Error) => {
        const msg = e.message || "";
        if (msg.includes("profile_incomplete")) {
          setError("Necesitas completar tu perfil público al 100%.");
        } else if (msg.includes("promotion_expired")) {
          setError("Esta promoción ya expiró.");
        } else if (msg.includes("promotion_not_found")) {
          setError("La promoción no está disponible en este momento.");
        } else {
          setError("No se pudo generar tu cupón. Intenta de nuevo.");
        }
      })
      .finally(() => setLoading(false));
  }, [open, promotionSlug, issue, queryClient]);

  const handleCopy = async () => {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Ticket className="size-6" aria-hidden />
          </div>
          <DialogTitle className="text-center">
            {coupon ? "¡Tu cupón está listo!" : "Generando tu cupón…"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {promotionTitle ?? "Promoción del Oriente Maya"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {coupon && (
          <div className="flex flex-col items-center gap-4 py-2">
            <CouponQR value={coupon.qr_token} size={200} />
            <div className="w-full">
              <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Código
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 text-lg font-semibold tracking-wider">
                  {coupon.code}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  aria-label="Copiar código"
                >
                  {copied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
            {coupon.discount_percent ? (
              <p className="text-sm">
                Descuento:{" "}
                <strong>
                  {Math.round(Number(coupon.discount_percent))}%
                </strong>
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Válido hasta{" "}
              {new Date(coupon.valid_until).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Presenta este QR o dicta el código en el negocio para aplicar
              tu descuento.
            </p>
          </div>
        )}

        <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button asChild>
            <Link to="/cuenta/mis-cupones">Ver mis cupones</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}