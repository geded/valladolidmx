/**
 * AddToTravelPlanButton — Iniciativa 7 · Sub-ola C.
 *
 * Botón universal "➕ Agregar a Mi Viaje" para cualquier tarjeta del
 * ecosistema (destinos, empresas, productos, eventos, hoteles,
 * restaurantes, experiencias). Contrato único de kinds definido por
 * `TravelItemKind` en `travel-plans.functions.ts`.
 *
 * Reglas:
 *  - No escribe directo a Supabase. Toda operación pasa por
 *    `addPlanItem()` (Sub-ola B) que a su vez respeta RLS y auth.
 *  - Sin sesión escribe exclusivamente en AnonymousTravelDraft local; no
 *    abre gate ni crea filas remotas por interacción.
 *  - La navegación pública NO cambia. El botón sigue visible siempre.
 *  - Tras registro, el runner global importa el draft al Travel Plan.
 *  - Idempotente: el servidor detecta duplicados por
 *    `(plan_id, item_kind, target_id)` y devuelve `created:false`.
 *  - No rediseña la tarjeta contenedora. Se inserta como acción compacta.
 *  - Separado de FavoriteButton (favoritos = guardado rápido;
 *    Mi Viaje = expediente estructurado del viajero).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  addPlanItem,
  getMyActivePlan,
  removePlanItem,
  type TravelItemKind,
} from "@/lib/traveler/travel-plans.functions";
import {
  useAnonymousTrip,
  ANON_COPY,
  planAcknowledgedCopy,
  type AnonymousItemKind,
} from "@/lib/traveler/anonymous-draft";
import { useProgressiveRegistration } from "@/lib/traveler/anonymous-draft/use-progressive-registration";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { useHidesTravelerSurfaces } from "@/lib/profile-mode/use-profile-mode";

export interface AddToTravelPlanButtonProps {
  kind: TravelItemKind;
  targetId: string;
  title: string;
  slug?: string | null;
  imageUrl?: string | null;
  subtitle?: string | null;
  notes?: string | null;
  /** Compacto por defecto para caber en tarjetas. */
  variant?: "compact" | "full";
  className?: string;
  /**
   * TP1.1 · Modo de elegibilidad.
   *  - `universal` (default): sólo renderiza para kinds universalizados
   *    (`product`, `business`, `event`) con identidad canónica UUID.
   *  - `legacy`: preserva integraciones previas (destinos ya en producción).
   */
  eligibilityMode?: "universal" | "legacy";
}

/**
 * TP1.4A-R1 · Phase reactivo mínimo.
 *
 * `phase` describe SOLO la transición local (idle → adding → error). El
 * estado "pertenece al viaje" se deriva de la fuente canónica
 * (`alreadyInPlan`) más un override optimista efímero que se limpia en
 * cuanto la fuente canónica confirma la operación. De esta forma dos
 * tarjetas de la misma entidad se sincronizan sin duplicar stores.
 */
type Phase = "idle" | "adding" | "error";

export function AddToTravelPlanButton(props: AddToTravelPlanButtonProps) {
  // TP1.1 · Política central de elegibilidad. Superficies existentes que
  // integran `destination` deben pasar `eligibilityMode="legacy"` para
  // preservar comportamiento.
  const eligibility = evaluateTripEligibility({
    kind: props.kind,
    targetId: props.targetId,
    title: props.title,
    mode: props.eligibilityMode ?? "universal",
  });
  // Staff mode has no traveler panel: hide the personal trip action.
  // Decided here, before the inner hooks run, because the profile mode
  // resolves after the first render and an early return between hooks
  // would change the hook order.
  const hideForStaff = useHidesTravelerSurfaces();
  if (!eligibility.eligible || hideForStaff) return null;
  return <AddToTravelPlanButtonInner {...props} />;
}

function AddToTravelPlanButtonInner({
  kind,
  targetId,
  title,
  slug,
  imageUrl,
  subtitle,
  notes,
  variant = "compact",
  className,
}: AddToTravelPlanButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchActive = useServerFn(getMyActivePlan);
  const addItem = useServerFn(addPlanItem);
  const removeItem = useServerFn(removePlanItem);
  const anon = useAnonymousTrip();
  const limitRegistration = useProgressiveRegistration("hard_limit");

  // Solo lee el plan activo si hay sesión; determina si el item ya existe.
  const { data: active } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const alreadyInPlan = useMemo(() => {
    if (user?.id) {
      if (!active?.items) return false;
      return active.items.some((it) => it.item_kind === kind && it.target_id === targetId);
    }
    return Boolean(
      anon.trip?.plannedItems?.some(
        (it) => it.kind === (kind as AnonymousItemKind) && it.targetId === targetId,
      ),
    );
  }, [active, kind, targetId, user?.id, anon.trip]);

  // Identificador de la parada ya guardada: «quitar» necesita el id del
  // registro, no el de la empresa. Se lee siempre de la fuente canónica.
  const planItemId = useMemo(() => {
    if (!user?.id || !active?.items) return null;
    return (
      active.items.find((it) => it.item_kind === kind && it.target_id === targetId)?.id ??
      null
    );
  }, [active, kind, targetId, user?.id]);

  const [phase, setPhase] = useState<Phase>("idle");
  // Override optimista: `true` mientras se está agregando y aún no llega la
  // fuente canónica; se limpia en cuanto `alreadyInPlan` confirma o al
  // detectar error. Nunca se convierte en segunda fuente de verdad.
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  useEffect(() => {
    if (optimisticDone !== null && optimisticDone === alreadyInPlan) {
      setOptimisticDone(null);
    }
  }, [alreadyInPlan, optimisticDone]);

  const mutation = useMutation({
    mutationFn: async () => {
      const snapshot = {
        title,
        slug: slug ?? null,
        image_url: imageUrl ?? null,
        subtitle: subtitle ?? null,
      };
      return addItem({
        data: {
          kind,
          targetId,
          snapshot,
          notes: notes ?? null,
        },
      });
    },
    onMutate: () => {
      setPhase("adding");
      setOptimisticDone(true);
    },
    onSuccess: (res) => {
      setPhase("idle");
      void queryClient.invalidateQueries({
        queryKey: ["traveler", "active-plan", user?.id],
      });
      // A15 · notifica cambio de plan al Concierge.
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged(res.created ? "add_item" : "already_in_plan"),
      );
      // AC1.2 · Founder Intent Recognition Principle.
      const c = res.created ? planAcknowledgedCopy(title) : ANON_COPY.intent.planAlready;
      toast(c.title, { description: c.body });
    },
    onError: (e) => {
      // Rollback visual: la fuente canónica queda intacta.
      setOptimisticDone(null);
      setPhase("error");
      toast.error(e instanceof Error ? e.message : "Intenta de nuevo.");
    },
  });

  // «Quitar» comparte el mismo botón: cuando la parada ya está en el viaje,
  // tocarla la retira. Usa el id del registro de la fuente canónica.
  const removal = useMutation({
    mutationFn: async () => {
      if (!planItemId) throw new Error("missing_item");
      return removeItem({ data: { itemId: planItemId } });
    },
    onMutate: () => {
      setPhase("adding");
      setOptimisticDone(false);
    },
    onSuccess: () => {
      setPhase("idle");
      void queryClient.invalidateQueries({
        queryKey: ["traveler", "active-plan", user?.id],
      });
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("remove_item"),
      );
      const c = ANON_COPY.intent.planReleased;
      toast(c.title, { description: c.body });
    },
    onError: () => {
      setOptimisticDone(null);
      setPhase("error");
      toast.error("Intenta de nuevo.");
    },
  });

  const anonBusyRef = useRef(false);
  const [anonBusy, setAnonBusy] = useState(false);

  async function handleAnonymousAdd() {
    // Guard contra doble-click (aria-pressed + disabled ya lo bloquean tras
    // el primer render, pero un doble-click rápido puede colarse antes de
    // que React reprocese). El ref garantiza idempotencia.
    if (anonBusyRef.current) return;
    anonBusyRef.current = true;
    setAnonBusy(true);
    setPhase("adding");
    setOptimisticDone(true);
    try {
      const res = await anon.addPlannedItem({
        kind: kind as AnonymousItemKind,
        targetId,
        title,
        slug: slug ?? undefined,
        imageUrl: imageUrl ?? undefined,
        subtitle: subtitle ?? undefined,
        notes: notes ?? undefined,
      });
      if (!res.ok && res.reason === "limit") {
        setOptimisticDone(null);
        setPhase("idle");
        const c = ANON_COPY.intent.limitFriendly;
        toast(c.title, { description: c.body });
        limitRegistration.run();
        return;
      }
      // No forzamos `optimisticDone` a null aquí: el efecto lo limpia en
      // cuanto la suscripción canónica reporta `alreadyInPlan = true`.
      setPhase("idle");
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("add_item"),
      );
      const c = planAcknowledgedCopy(title);
      toast(c.title, { description: c.body });
    } catch (e) {
      setOptimisticDone(null);
      setPhase("error");
      toast.error(e instanceof Error ? e.message : "Intenta de nuevo.");
    } finally {
      anonBusyRef.current = false;
      setAnonBusy(false);
    }
  }

  async function handleAnonymousRemove() {
    if (anonBusyRef.current) return;
    anonBusyRef.current = true;
    setAnonBusy(true);
    setPhase("adding");
    setOptimisticDone(false);
    try {
      await anon.removePlannedItem(kind as AnonymousItemKind, targetId);
      setPhase("idle");
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("remove_item"),
      );
      const c = ANON_COPY.intent.planReleased;
      toast(c.title, { description: c.body });
    } catch (e) {
      setOptimisticDone(null);
      setPhase("error");
      toast.error(e instanceof Error ? e.message : "Intenta de nuevo.");
    } finally {
      anonBusyRef.current = false;
      setAnonBusy(false);
    }
  }

  const busy = phase === "adding" || mutation.isPending || removal.isPending || anonBusy;
  // Fuente de verdad = canónica; override optimista sólo si aún no confirma.
  const done = optimisticDone ?? alreadyInPlan;

  // Caja idéntica a la del botón compartido (`size="sm"` / `size="default"`):
  // en la fila de acciones de la ficha (compartir, guardar, taxi) todos los
  // botones deben verse del mismo tamaño, también en celular.
  const base =
    variant === "compact"
      ? "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-xs font-medium transition-colors disabled:opacity-60"
      : "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-pill border px-4 text-sm font-medium transition-colors disabled:opacity-60";
  const skin = done
    ? "border-primary bg-primary/10 text-primary"
    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10";

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? "Quitar de Mi Viaje" : "Agregar a Mi Viaje"}
      onClick={(e) => {
        // Muchas tarjetas envuelven todo en un <a>/<Link>. Evita navegar
        // cuando el usuario pulsa el botón.
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        // Ya está en el viaje ⇒ el mismo botón lo quita.
        if (done) {
          if (user?.id) {
            removal.mutate();
          } else {
            void handleAnonymousRemove();
          }
          return;
        }
        if (user?.id) {
          mutation.mutate();
        } else {
          void handleAnonymousAdd();
        }
      }}
      title={done ? "Quitar de Mi Viaje" : "Agregar a Mi Viaje"}
      className={[base, skin, className ?? ""].join(" ")}
    >
      {busy && !done ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : done ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Plus className="size-4" aria-hidden />
      )}
      <span className="hidden sm:inline">{done ? "Ya está en Mi Viaje" : busy ? "Agregando…" : "Agregar a Mi Viaje"}</span>
      <span className="sm:hidden">{done ? "En Mi Viaje" : busy ? "Agregando…" : "Mi Viaje"}</span>
    </button>
  );
}
