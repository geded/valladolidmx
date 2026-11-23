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
import { ChevronDown, Minus, PencilLine, Plus, ShoppingBag } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { ExperienceMenu } from "@/components/experience-builder/blocks/experience-menu/ExperienceMenu";
import type { ExperienceMenuDTO } from "@/lib/experience-builder/blocks/experience-menu/contract";
import {
  currentReturnPath,
  rememberAuthReturnPath,
  rememberCheckoutOrigin,
} from "@/lib/navigation/session-context";
import { startMenuOrder } from "@/lib/commerce/store-orders.functions";
import {
  MENU_ORDER_NOTE_MAX,
  buildMenuOrderLines,
  cleanMenuNote,
  isMenuExtraSection,
  isMenuItemOrderable,
  menuOrderHasMainItem,
  updateMenuOrder,
  type MenuLineCustom,
  type MenuOrderable,
} from "@/lib/commerce/store-catalog";

const STORAGE_PREFIX = "valladolidmx.menu-order.";
/** El pedido se guarda en el dispositivo un día: sobrevive a abrir la cuenta en otra pestaña. */
const CART_TTL_MS = 24 * 60 * 60_000;

interface StoredCart {
  items: Record<string, number>;
  custom: Record<string, MenuLineCustom>;
}

function readStoredCart(key: string): StoredCart | null {
  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as
      | { at?: number; items?: Record<string, number>; custom?: Record<string, MenuLineCustom> }
      | Record<string, number>;
    if (parsed && typeof parsed === "object" && "items" in parsed && parsed.items) {
      if (typeof parsed.at === "number" && Date.now() - parsed.at > CART_TTL_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
      const custom = (parsed.custom ?? {}) as Record<string, MenuLineCustom>;
      return { items: parsed.items as Record<string, number>, custom };
    }
    return { items: parsed as Record<string, number>, custom: {} };
  } catch {
    return null;
  }
}

function money(pesos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(pesos);
}

export function MenuOrderCart({ dto, businessName }: { dto: ExperienceMenuDTO; businessName?: string }) {
  const businessId = dto.capabilities.ordering?.businessId ?? null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const order = useServerFn(startMenuOrder);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState<Record<string, MenuLineCustom>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showLines, setShowLines] = useState(false);
  // Bebida que se está personalizando (extras y nota).
  const [editing, setEditing] = useState<string | null>(null);
  const [draftExtras, setDraftExtras] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const storageKey = businessId ? `${STORAGE_PREFIX}${businessId}` : null;

  const orderable: MenuOrderable[] = useMemo(
    () =>
      dto.sections.flatMap((s) =>
        s.items.filter(isMenuItemOrderable).map((i) => ({
          id: i.id as string,
          name: i.name,
          price: i.price ?? null,
          extra: isMenuExtraSection(s.title),
        })),
      ),
    [dto],
  );

  // El pedido sobrevive a abrir la cuenta (también en otra pestaña) y a
  // regresar desde la confirmación: se guarda en el dispositivo.
  useEffect(() => {
    if (!storageKey) return;
    const stored = readStoredCart(storageKey);
    if (stored) {
      setCart(stored.items);
      setCustom(stored.custom);
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !loaded) return;
    try {
      window.sessionStorage.removeItem(storageKey);
      if (Object.keys(cart).length) {
        // Sólo se guardan extras y notas de bebidas que siguen en el pedido.
        const kept = Object.fromEntries(Object.entries(custom).filter(([id]) => (cart[id] ?? 0) > 0));
        window.localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), items: cart, custom: kept }));
      } else window.localStorage.removeItem(storageKey);
    } catch {
      /* sin almacenamiento: el pedido vive en la página */
    }
  }, [cart, custom, storageKey, loaded]);

  if (!businessId) return <ExperienceMenu dto={dto} />;

  const summary = buildMenuOrderLines(cart, custom, orderable);
  const hasMain = menuOrderHasMainItem(cart, orderable);
  const extrasList = orderable.filter((o) => o.extra);
  const byId = new Map(orderable.map((o) => [o.id, o]));
  const editingItem = editing ? byId.get(editing) : undefined;

  function openCustom(id: string) {
    setEditing(id);
    setDraftExtras(custom[id]?.extras ?? []);
    setDraftNote(custom[id]?.note ?? "");
  }

  function saveCustom() {
    if (!editing) return;
    const note = cleanMenuNote(draftNote);
    const extras = draftExtras.filter((id) => byId.get(id)?.extra);
    setCustom((c) => {
      const next = { ...c };
      if (!note && extras.length === 0) delete next[editing];
      else next[editing] = { extras, note };
      return next;
    });
    setEditing(null);
  }
  const origin = businessName ? `Seguir pidiendo en ${businessName}` : "Seguir pidiendo";
  const change = (id: string, quantity: number) => setCart((c) => updateMenuOrder(c, orderable, id, quantity));

  async function submit() {
    if (!businessId || summary.lines.length === 0) return;
    if (!hasMain) {
      toast.error("Los extras acompañan una bebida o platillo. Agrega primero una bebida.");
      return;
    }
    const back = currentReturnPath("#menu");
    if (!user) {
      rememberAuthReturnPath(back, businessName);
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await order({
        data: {
          businessId,
          items: summary.lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            ...(l.note ? { note: l.note } : {}),
            ...(l.forItemId ? { forItemId: l.forItemId } : {}),
          })),
        },
      });
      // El pedido se conserva hasta confirmarlo: al regresar sigue igual.
      rememberCheckoutOrigin(res.orderId, {
        path: back,
        label: origin,
        ...(storageKey ? { cartKey: storageKey } : {}),
      });
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
        const isExtra = orderable.find((o) => o.id === id)?.extra === true;
        if (qty === 0) {
          const locked = isExtra && !hasMain;
          return (
            <button
              type="button"
              onClick={() => {
                if (locked) {
                  toast.message("Primero elige una bebida", {
                    description: `${item.name} se agrega como extra de una bebida o platillo.`,
                  });
                  return;
                }
                change(id, 1);
              }}
              aria-disabled={locked}
              aria-label={locked ? `${item.name}: agrega primero una bebida` : `Agregar ${item.name} a tu pedido`}
              title={locked ? "Agrega primero una bebida" : undefined}
              className={`inline-flex size-8 touch-manipulation select-none items-center justify-center rounded-pill border bg-background transition-colors ${
                locked
                  ? "border-border/60 text-muted-foreground/50"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-pill border border-foreground bg-background">
            <button
              type="button"
              onClick={() => change(id, qty - 1)}
              aria-label={`Quitar un ${item.name}`}
              className="inline-flex size-8 touch-manipulation select-none items-center justify-center rounded-pill"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="min-w-4 text-center text-sm font-semibold tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => change(id, qty + 1)}
              aria-label={`Agregar otro ${item.name}`}
              className="inline-flex size-8 touch-manipulation select-none items-center justify-center rounded-pill"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </span>
        );
      }}
      footer={
        summary.pieces > 0 || Object.keys(cart).length > 0 ? (
          <div className="sticky bottom-3 z-20 mt-4 rounded-2xl border border-border bg-card p-3 shadow-elevated sm:p-4">
            {showLines && summary.lines.length > 0 ? (
              <ul className="mb-3 max-h-[45vh] divide-y divide-border overflow-y-auto border-b border-border pb-2">
                {summary.lines.map((l) => {
                  const isExtra = byId.get(l.menuItemId)?.extra === true;
                  return (
                    <li
                      key={`${l.menuItemId}-${l.forItemId ?? "solo"}`}
                      className={`flex items-start justify-between gap-3 py-2 text-sm ${l.forItemId ? "pl-4" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className={l.forItemId ? "text-muted-foreground" : "font-medium"}>
                          {l.quantity} × {l.forItemId ? `+ ${l.name}` : l.name}
                        </p>
                        {l.note ? <p className="text-xs text-muted-foreground">Nota: {l.note}</p> : null}
                        {!isExtra ? (
                          <button
                            type="button"
                            onClick={() => openCustom(l.menuItemId)}
                            className="mt-0.5 inline-flex touch-manipulation items-center gap-1 text-xs font-medium text-primary"
                          >
                            <PencilLine className="size-3.5" aria-hidden />
                            {extrasList.length > 0 ? "Extras o nota" : "Agregar nota"}
                          </button>
                        ) : null}
                      </div>
                      <span className="shrink-0 tabular-nums">{money(l.subtotal)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowLines((v) => !v)}
                aria-expanded={showLines}
                className="flex min-w-0 touch-manipulation items-center gap-3 text-left"
              >
                <ShoppingBag className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    Tu pedido · {summary.pieces} {summary.pieces === 1 ? "producto" : "productos"} · {money(summary.total)}
                    <ChevronDown
                      className={`size-4 shrink-0 transition-transform ${showLines ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {!hasMain
                      ? "Los extras acompañan una bebida: agrega una para continuar."
                      : showLines
                        ? "Pagas en línea y lo recoges en el local."
                        : extrasList.length > 0
                          ? "Toca para ver tu pedido y agregar extras o notas."
                          : "Toca para ver tu pedido y agregar notas."}
                  </span>
                </span>
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCart({});
                    setCustom({});
                    setShowLines(false);
                  }}
                  disabled={busy}
                >
                  Vaciar
                </Button>
                <Button type="button" size="sm" onClick={submit} disabled={busy || !hasMain}>
                  {busy ? "Preparando…" : "Pedir y pagar"}
                </Button>
              </div>
            </div>

            <Dialog open={editing !== null} onOpenChange={(o) => (o ? null : setEditing(null))}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem?.name ?? "Tu bebida"}</DialogTitle>
                  <DialogDescription>
                    {(cart[editing ?? ""] ?? 0) > 1
                      ? `Se aplica a tus ${cart[editing ?? ""]} ${editingItem?.name ?? ""}. Si quieres uno distinto, dilo en la nota.`
                      : "Elige extras y escribe cómo la quieres."}
                  </DialogDescription>
                </DialogHeader>
                {extrasList.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Extras
                    </legend>
                    {extrasList.map((x) => {
                      const checked = draftExtras.includes(x.id);
                      return (
                        <label
                          key={x.id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setDraftExtras((d) => (v ? [...d, x.id] : d.filter((id) => id !== x.id)))
                              }
                            />
                            {x.name}
                          </span>
                          <span className="tabular-nums text-muted-foreground">+{money(x.price ?? 0)}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : null}
                <div className="space-y-1">
                  <label htmlFor="menu-line-note" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Nota para {businessName ?? "la empresa"}
                  </label>
                  <Textarea
                    id="menu-line-note"
                    value={draftNote}
                    maxLength={MENU_ORDER_NOTE_MAX}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Ej. sin azúcar, poco hielo, extra caliente"
                    rows={2}
                  />
                  <p className="text-right text-[11px] text-muted-foreground">
                    {draftNote.length}/{MENU_ORDER_NOTE_MAX}
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={saveCustom}>
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null
      }
    />
  );
}
