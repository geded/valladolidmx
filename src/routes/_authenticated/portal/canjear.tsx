/**
 * /portal/canjear — Ola 2 · Panel de canje de cupones para el negocio.
 *
 * Staff del negocio activo puede:
 *  - Escribir/pegar el código impreso.
 *  - Escanear el QR (cámara del dispositivo, html5-qrcode).
 *  - Ver ficha del cupón (título, viajero, descuento, vigencia).
 *  - Marcar como canjeado (update RLS: business_users).
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, CameraOff, Check, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  lookupCoupon,
  redeemCoupon,
  type CouponLookupResult,
} from "@/lib/promotions/coupons.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/canjear")({
  component: RedeemPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setId(detail ?? null);
    };
    window.addEventListener("portal:active-business-changed", handler);
    return () =>
      window.removeEventListener("portal:active-business-changed", handler);
  }, []);
  return id;
}

function RedeemPage() {
  const businessId = useActiveBusinessId();
  const lookup = useServerFn(lookupCoupon);
  const redeem = useServerFn(redeemCoupon);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CouponLookupResult | null>(null);
  const [channel, setChannel] = useState<"qr" | "code">("code");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const scannerInstance = useRef<{ stop: () => Promise<void> } | null>(null);

  const doLookup = async (key: string, ch: "qr" | "code") => {
    if (!businessId) {
      toast.error("Selecciona una empresa activa primero.");
      return;
    }
    if (!key.trim()) return;
    setBusy(true);
    setChannel(ch);
    try {
      const r = await lookup({ data: { key: key.trim(), business_id: businessId } });
      setResult(r);
      if (r.reason === "not_found")
        toast.error("No encontramos un cupón con ese código.");
      else if (r.reason === "not_your_business")
        toast.error("Este cupón no es de esta empresa.");
      else if (r.reason === "already_redeemed")
        toast.warning("Este cupón ya fue canjeado.");
      else if (r.reason === "expired") toast.warning("Este cupón ya expiró.");
    } catch (e) {
      toast.error((e as Error).message || "Error al buscar el cupón.");
    } finally {
      setBusy(false);
    }
  };

  const doRedeem = async () => {
    if (!result?.coupon) return;
    setBusy(true);
    try {
      await redeem({ data: { coupon_id: result.coupon.id, channel } });
      toast.success("¡Cupón canjeado! Aplica el descuento.");
      setResult(null);
      setCode("");
    } catch (e) {
      toast.error((e as Error).message || "Error al canjear.");
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    if (!scannerRef.current) return;
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = scannerRef.current;
      el.id = el.id || `qr-scanner-${Date.now()}`;
      const scanner = new Html5Qrcode(el.id);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          scannerInstance.current = null;
          setScanning(false);
          setCode(decoded);
          void doLookup(decoded, "qr");
        },
        () => {},
      );
      scannerInstance.current = scanner as unknown as { stop: () => Promise<void> };
    } catch (e) {
      toast.error(
        "No pudimos abrir la cámara. Verifica los permisos del navegador.",
      );
      setScanning(false);
      console.error(e);
    }
  };

  const stopScan = async () => {
    try {
      await scannerInstance.current?.stop();
    } catch {
      /* noop */
    }
    scannerInstance.current = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      void scannerInstance.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
          Panel de canje
        </p>
        <h1 className="text-2xl font-semibold">Canjear cupón digital</h1>
        <p className="text-sm text-muted-foreground">
          Pide al viajero que te muestre el QR o dicte el código de su cupón.
          Sólo puedes canjear cupones asignados a la empresa activa.
        </p>
      </header>

      {!businessId && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Selecciona una empresa activa en la parte superior para poder canjear.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label
          htmlFor="coupon-code"
          className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
        >
          Código del cupón
        </label>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void doLookup(code, "code");
          }}
        >
          <Input
            id="coupon-code"
            placeholder="VMX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-wider"
            autoComplete="off"
          />
          <Button type="submit" disabled={busy || !code.trim()}>
            <Search className="mr-2 size-4" aria-hidden />
            Buscar
          </Button>
        </form>

        <div className="mt-3 flex items-center gap-2">
          {!scanning ? (
            <Button
              type="button"
              variant="outline"
              onClick={startScan}
              disabled={busy || !businessId}
            >
              <Camera className="mr-2 size-4" aria-hidden />
              Escanear QR
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={stopScan}>
              <CameraOff className="mr-2 size-4" aria-hidden />
              Detener
            </Button>
          )}
        </div>
        <div
          ref={scannerRef}
          id="qr-scanner-region"
          className={
            scanning
              ? "mt-3 overflow-hidden rounded-lg border border-border"
              : "hidden"
          }
        />
      </section>

      {result?.coupon && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Ticket className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold">{result.coupon.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Viajero: {result.traveler_display_name ?? "—"}
              </p>
              <p className="mt-0.5 text-sm">
                Descuento:{" "}
                <strong>
                  {result.coupon.discount_percent
                    ? `${Math.round(Number(result.coupon.discount_percent))}%`
                    : "según promoción"}
                </strong>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Código: <code>{result.coupon.code}</code> · Vigencia:{" "}
                {new Date(result.coupon.valid_until).toLocaleDateString("es-MX")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResult(null);
                setCode("");
              }}
            >
              Cancelar
            </Button>
            {result.coupon.status === "active" &&
              new Date(result.coupon.valid_until) > new Date() && (
                <Button type="button" onClick={doRedeem} disabled={busy}>
                  <Check className="mr-2 size-4" aria-hidden />
                  Marcar como canjeado
                </Button>
              )}
          </div>
        </section>
      )}
    </div>
  );
}