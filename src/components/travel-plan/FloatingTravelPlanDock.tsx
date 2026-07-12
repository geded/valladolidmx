/**
 * FloatingTravelPlanDock — Ola CV3.1
 *
 * Presencia global del Travel Plan en toda la superficie Discovery: chip
 * flotante con contador vivo de ítems del plan activo. Al abrir muestra
 * un Sheet lateral con la lista snapshot de los ítems + CTA a la vista
 * completa (/cuenta/mi-viaje) sin sacar al viajero del recorrido.
 *
 * Reglas (CV3 · Discovery First):
 *  · Sólo autenticado. Oculto en shells operativos (/cuenta, /cms, /portal,
 *    /admin, /concierge, /empresa, /auth) para no duplicar chrome.
 *  · Cero escritura directa a BD: sólo lectura (`getMyActivePlan`) y
 *    navegación a la vista completa. Cualquier mutación sigue viajando
 *    por la Write API oficial (CV2.1).
 *  · Se refresca automáticamente cuando otro punto del sitio emite
 *    `alux:plan-changed` (bus de señales A15).
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  Luggage,
  MapPin,
  ShoppingBag,
  Sparkles,
  StickyNote,
  Ticket,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyActivePlan,
  type TravelItemKind,
} from "@/lib/traveler/travel-plans.functions";
import { getMyConfirmedTravel } from "@/lib/concierge/orders.functions";
import {
  narratePlan,
  type AluxTravelerSuggestion,
} from "@/lib/traveler/alux-traveler.functions";
import { onPlanChanged } from "@/lib/alux/plan-signals";
import { useTranslation } from "@/i18n/context";
import { ALUX_KB_LOCALES, type AluxKbLocale } from "@/lib/alux/knowledge.functions";

const HIDE_PREFIXES = [
  "/cuenta",
  "/cms",
  "/portal",
  "/admin",
  "/concierge",
  "/empresa",
  "/auth",
  "/carrito",
];

const KIND_ICON: Record<
  TravelItemKind,
  React.ComponentType<{ className?: string }>
> = {
  destination: MapPin,
  business: Building2,
  product: ShoppingBag,
  event: Ticket,
  note: StickyNote,
};

const KIND_LABEL: Record<TravelItemKind, string> = {
  destination: "Destino",
  business: "Empresa",
  product: "Producto",
  event: "Evento",
  note: "Nota",
};

export function FloatingTravelPlanDock() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHiddenRoute = HIDE_PREFIXES.some((p) => pathname.startsWith(p));
  const enabled = !!user && !isHiddenRoute;

  const fetchActive = useServerFn(getMyActivePlan);
  const q = useQuery({
    queryKey: ["traveler", "active-plan", "dock", user?.id ?? "anon"],
    queryFn: () => fetchActive(),
    enabled,
    staleTime: 30_000,
  });
  const fetchConfirmed = useServerFn(getMyConfirmedTravel);
  const confirmedQ = useQuery({
    queryKey: ["traveler", "confirmed-travel", "dock", user?.id ?? "anon"],
    queryFn: () => fetchConfirmed(),
    enabled,
    staleTime: 60_000,
  });

  const [open, setOpen] = useState(false);
  const { locale: rawLocale } = useTranslation();
  const locale: AluxKbLocale = (ALUX_KB_LOCALES as readonly string[]).includes(
    rawLocale,
  )
    ? (rawLocale as AluxKbLocale)
    : "es";
  const narrate = useServerFn(narratePlan);
  const narration = useMutation({
    mutationFn: async () =>
      (await narrate({ data: { locale } })) as AluxTravelerSuggestion,
  });

  useEffect(() => {
    if (!enabled) return;
    return onPlanChanged(() => {
      void q.refetch();
      void confirmedQ.refetch();
      narration.reset();
    });
  }, [enabled, q, confirmedQ]);

  if (!enabled) return null;

  const items = q.data?.items ?? [];
  const count = items.length;
  const confirmed = confirmedQ.data ?? null;
  const isConfirmed = !!confirmed && confirmed.status !== "refunded";

  // No molestar cuando aún no hay ítems ni viaje confirmado ni sheet abierto.
  if (count === 0 && !isConfirmed && !open) return null;

  const planTitle = q.data?.plan.title ?? "Tu viaje";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          isConfirmed
            ? `Viaje confirmado ${confirmed!.folio}`
            : `Tu viaje (${count} ${count === 1 ? "ítem" : "ítems"})`
        }
        className={`fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold shadow-elevated backdrop-blur transition-colors md:left-6 ${
          isConfirmed
            ? "border-success/40 bg-success/10 text-foreground hover:bg-success/15"
            : "border-primary/25 bg-card/95 text-foreground hover:bg-card"
        }`}
      >
        <span
          className={`grid size-7 place-items-center rounded-full ${
            isConfirmed
              ? "bg-success text-success-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          <Luggage className="h-4 w-4" aria-hidden />
        </span>
        <span className="hidden sm:inline">
          {isConfirmed ? "Viaje confirmado" : "Tu viaje"}
        </span>
        {isConfirmed ? (
          <span className="inline-flex items-center rounded-full bg-success/20 px-2 text-[11px] font-bold tracking-wider text-success-foreground">
            {confirmed!.folio}
          </span>
        ) : (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
            {count}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="truncate">{planTitle}</SheetTitle>
            <SheetDescription>
              {isConfirmed
                ? `Tu viaje al Oriente Maya de Yucatán está confirmado. Folio ${confirmed!.folio}.`
                : count === 0
                ? "Aún no has guardado nada. Añade destinos, empresas, productos o eventos desde cualquier ficha."
                : `${count} ${count === 1 ? "ítem guardado" : "ítems guardados"}. Abre la vista completa para editar fechas, notas y enviar a tu concierge.`}
            </SheetDescription>
          </SheetHeader>

          {isConfirmed ? (
            <div className="mt-4 rounded-xl border border-success/40 bg-success/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-success-foreground/80">
                Viaje confirmado
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {confirmed!.editorial_title ?? "Tu viaje al Oriente Maya de Yucatán"}
              </p>
              {typeof confirmed!.days_to_trip === "number" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {confirmed!.days_to_trip > 0
                    ? `Faltan ${confirmed!.days_to_trip} días para tu llegada.`
                    : confirmed!.days_to_trip === 0
                      ? "Hoy comienza tu viaje al Oriente Maya."
                      : "Tu viaje está en curso o recién concluyó."}
                </p>
              ) : null}
            </div>
          ) : null}

          {count > 0 ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Alux · Tu viaje en una línea
                  </p>
                  {narration.data ? (
                    <p className="mt-1 text-xs leading-relaxed text-foreground whitespace-pre-line">
                      {narration.data.text}
                    </p>
                  ) : narration.isPending ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Alux está leyendo tu viaje…
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => narration.mutate()}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Narrar mi viaje
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.map((it) => {
              const Icon = KIND_ICON[it.item_kind] ?? MapPin;
              const snap = it.snapshot ?? {};
              const title =
                (snap.title && snap.title.trim()) ||
                KIND_LABEL[it.item_kind] ||
                "Ítem";
              return (
                <div
                  key={it.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {title}
                    </p>
                    {snap.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {snap.subtitle}
                      </p>
                    ) : (
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {KIND_LABEL[it.item_kind]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              to="/cuenta/mi-viaje"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Abrir mi viaje
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Seguir explorando
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}