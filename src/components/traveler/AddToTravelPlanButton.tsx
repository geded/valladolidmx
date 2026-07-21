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
  type TravelItemKind,
} from "@/lib/traveler/travel-plans.functions";
import {
  useAnonymousTrip,
  ANON_COPY,
  type AnonymousItemKind,
} from "@/lib/traveler/anonymous-draft";
import { useProgressiveRegistration } from "@/lib/traveler/anonymous-draft/use-progressive-registration";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";

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

export function AddToTravelPlanButton({
  kind,
  targetId,
  title,
  slug,
  imageUrl,
  subtitle,
  notes,
  variant = "compact",
  className,
  eligibilityMode = "universal",
}: AddToTravelPlanButtonProps) {
  // TP1.1 · Política central de elegibilidad. Superficies existentes que
  // integran `destination` deben pasar `eligibilityMode="legacy"` para
  // preservar comportamiento.
  const eligibility = evaluateTripEligibility({
    kind,
    targetId,
    title,
    mode: eligibilityMode,
  });
  if (!eligibility.eligible) return null;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchActive = useServerFn(getMyActivePlan);
  const addItem = useServerFn(addPlanItem);
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
      const c = res.created ? ANON_COPY.intent.planAcknowledged : ANON_COPY.intent.planAlready;
      toast(c.title, { description: c.body });
    },
    onError: (e) => {
      // Rollback visual: la fuente canónica queda intacta.
      setOptimisticDone(null);
      setPhase("error");
      toast.error(e instanceof Error ? e.message : "Intenta de nuevo.");
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
      const c = ANON_COPY.intent.planAcknowledged;
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

  const busy = phase === "adding" || mutation.isPending || anonBusy;
  // Fuente de verdad = canónica; override optimista sólo si aún no confirma.
  const done = optimisticDone ?? alreadyInPlan;

  const base =
    variant === "compact"
      ? "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60"
      : "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60";
  const skin = done
    ? "border-primary bg-primary/10 text-primary"
    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10";

  return (
    <button
      type="button"
      disabled={busy || done}
      aria-pressed={done}
      onClick={(e) => {
        // Muchas tarjetas envuelven todo en un <a>/<Link>. Evita navegar
        // cuando el usuario pulsa el botón.
        e.preventDefault();
        e.stopPropagation();
        if (busy || done) return;
        if (user?.id) {
          mutation.mutate();
        } else {
          void handleAnonymousAdd();
        }
      }}
      title={done ? "Ya está en Mi Viaje" : "Agregar a Mi Viaje"}
      className={[base, skin, className ?? ""].join(" ")}
    >
      {busy && !done ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : done ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Plus className="size-3.5" aria-hidden />
      )}
      <span>
        {done ? "Ya está en Mi Viaje" : busy ? "Agregando…" : "Agregar a Mi Viaje"}
      </span>
    </button>
  );
}
