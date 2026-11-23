/**
 * MenuOrderCart — pedir de la carta y recoger en el local (fase 2 de
 * «Ventas en línea por empresa»).
 *
 * Envuelve el bloque oficial `vmx.experience.menu` sin cambiar su forma:
 * agrega «+» por bebida o platillo y un resumen del pedido al pie de la
 * carta. Sólo aparece cuando la empresa tiene «Pedidos para recoger» en su
 * página (`capabilities.ordering`). El pedido se paga en la confirmación de
 * siempre (/cuenta/checkout).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ExperienceMenu } from "@/components/experience-builder/blocks/experience-menu/ExperienceMenu";
import type { ExperienceMenuDTO } from "@/lib/experience-builder/blocks/experience-menu/contract";
import { rememberAuthReturnPath } from "@/lib/navigation/session-context";
import { startMenuOrder } from "@/lib/commerce/store-orders.functions";
import {
  isMenuItemOrderable,
  setMenuOrderQuantity,
  summarizeMenuOrder,
  type MenuOrderable,
} from "@/lib/commerce/store-catalog";

const STORAGE_PREFIX = "valladolidmx.menu-order.";

function money(pesos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(pesos);
}

export function MenuOrderCart({ dto }: { dto: ExperienceMenuDTO }) {
  const businessId = dto.capabilities.ordering?.businessId ?? null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const order = useServerFn(startMenuOrder);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const storageKey = businessId ? `${STORAGE_PREFIX}${businessId}` : null;

  const orderable: MenuOrderable[] = useMemo(
    () =>
      dto.sections.flatMap((s) =>
        s.items.filter(isMenuItemOrderable).map((i) => ({ id: i.id as string, name: i.name, price: i.price ?? null })),
      ),
    [dto],
  );

  // El pedido sobrevive a iniciar sesión en la misma pestaña.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) setCart(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* sin almacenamiento: el pedido vive en la página */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (Object.keys(cart).length) window.sessionStorage.setItem(storageKey, JSON.stringify(cart));
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      /* sin almacenamiento */
    }
  }, [cart, storageKey]);

  if (!businessId) return <ExperienceMenu dto={dto} />;

  const summary = summarizeMenuOrder(cart, orderable);

  async function submit() {
    if (!businessId || summary.lines.length === 0) return;
    if (!user) {
      rememberAuthReturnPath(`${window.location.pathname}${window.location.search}#menu`);
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await order({
        data: { businessId, items: summary.lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })) },
      });
      setCart({});
      void navigate({ to: "/cuenta/checkout/$orderId", params: { orderId: res.orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos preparar tu pedido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ExperienceMenu
      dto={dto}
      renderItemAction={(item) => {
        if (!isMenuItemOrderable(item)) return null;
        const id = item.id as string;
        const qty = cart[id] ?? 0;
        if (qty === 0) {
          return (
            <button
              type="button"
              onClick={() => setCart((c) => setMenuOrderQuantity(c, id, 1))}
              aria-label={`Agregar ${item.name} a tu pedido`}
              className="inline-flex size-8 items-center justify-center rounded-pill border border-border bg-background text-foreground transition-colors hover:border-foreground"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-pill border border-foreground bg-background">
            <button
              type="button"
              onClick={() => setCart((c) => setMenuOrderQuantity(c, id, qty - 1))}
              aria-label={`Quitar un ${item.name}`}
              className="inline-flex size-8 items-center justify-center rounded-pill"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="min-w-4 text-center text-sm font-semibold tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setCart((c) => setMenuOrderQuantity(c, id, qty + 1))}
              aria-label={`Agregar otro ${item.name}`}
              className="inline-flex size-8 items-center justify-center rounded-pill"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </span>
        );
      }}
      footer={
        summary.pieces > 0 ? (
          <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-elevated sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <ShoppingBag className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Tu pedido · {summary.pieces} {summary.pieces === 1 ? "producto" : "productos"} · {money(summary.total)}
                </p>
                <p className="text-xs text-muted-foreground">Pagas en línea y lo recoges en el local.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCart({})} disabled={busy}>
                Vaciar
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={busy}>
                {busy ? "Preparando…" : "Pedir y pagar"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
