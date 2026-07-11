/**
 * /cuenta/mis-cupones — Ola 2 · Cupones digitales del viajero.
 * Activos, canjeados y expirados. Cada card abre QR + código en modal.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ticket, QrCode, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyCoupons,
  type TravelerCoupon,
} from "@/lib/promotions/coupons.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CouponQR } from "@/components/promociones/CouponQR";

export const Route = createFileRoute("/_authenticated/cuenta/mis-cupones")({
  component: MisCuponesPage,
});

function MisCuponesPage() {
  const { user } = useAuth();
  const fetchCoupons = useServerFn(listMyCoupons);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["my-coupons", user?.id],
    queryFn: () => fetchCoupons(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const active = data.filter((c) => c.status === "active");
  const redeemed = data.filter((c) => c.status === "redeemed");
  const expired = data.filter((c) => c.status === "expired");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
          Mis cupones
        </p>
        <h1 className="text-2xl font-semibold">Tus descuentos del Oriente Maya</h1>
        <p className="text-sm text-muted-foreground">
          Presenta el QR o dicta el código en el negocio para aplicar tu
          descuento. Cada cupón es personal e intransferible.
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando tus cupones…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          No pudimos cargar tus cupones. Intenta más tarde.
        </p>
      )}

      {!isLoading && !data.length && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Aún no tienes cupones</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Explora las promociones vigentes y desbloquea la primera.
          </p>
          <Button asChild className="mt-4">
            <Link to="/promociones">Ver promociones</Link>
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <Section title="Activos" icon={<Ticket className="size-4" />}>
          {active.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </Section>
      )}
      {redeemed.length > 0 && (
        <Section title="Canjeados" icon={<CheckCircle2 className="size-4" />}>
          {redeemed.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </Section>
      )}
      {expired.length > 0 && (
        <Section title="Expirados" icon={<Clock className="size-4" />}>
          {expired.map((c) => (
            <CouponCard key={c.id} coupon={c} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {icon}
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CouponCard({ coupon }: { coupon: TravelerCoupon }) {
  const [open, setOpen] = useState(false);
  const isActive = coupon.status === "active";
  return (
    <>
      <article className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {coupon.business_name ?? "Oriente Maya"}
            </p>
            <h3 className="mt-0.5 font-semibold leading-snug">{coupon.title}</h3>
          </div>
          {coupon.discount_percent ? (
            <span className="rounded-pill bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
              -{Math.round(Number(coupon.discount_percent))}%
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-[11px]">
            {coupon.code}
          </code>
          <span>
            {isActive
              ? `Válido hasta ${formatDate(coupon.valid_until)}`
              : coupon.status === "redeemed"
                ? `Canjeado ${formatDate(coupon.redeemed_at ?? "")}`
                : "Expirado"}
          </span>
        </div>
        {isActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setOpen(true)}
          >
            <QrCode className="mr-2 size-4" aria-hidden />
            Mostrar QR
          </Button>
        )}
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{coupon.title}</DialogTitle>
            <DialogDescription className="text-center">
              {coupon.business_name ?? "Oriente Maya"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <CouponQR value={coupon.qr_token} size={240} />
            <code className="rounded-md bg-muted px-3 py-1.5 text-lg font-semibold tracking-wider">
              {coupon.code}
            </code>
            <p className="text-xs text-muted-foreground">
              Válido hasta {formatDate(coupon.valid_until)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}