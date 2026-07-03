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
 *  - Si el usuario no está autenticado, guarda la intención en
 *    localStorage (`travel_plan_guest_queue`) y sugiere iniciar sesión.
 *    La cola queda disponible para el próximo flush post-login.
 *  - Idempotente: el servidor detecta duplicados por
 *    `(plan_id, item_kind, target_id)` y devuelve `created:false`.
 *  - No rediseña la tarjeta contenedora. Se inserta como acción compacta.
 *  - Separado de FavoriteButton (favoritos = guardado rápido;
 *    Mi Viaje = expediente estructurado del viajero).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  addPlanItem,
  getMyActivePlan,
  type TravelItemKind,
} from "@/lib/traveler/travel-plans.functions";

const GUEST_QUEUE_KEY = "travel_plan_guest_queue";

interface GuestQueueItem {
  kind: TravelItemKind;
  targetId: string | null;
  title?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
  subtitle?: string | null;
  notes?: string | null;
  ts: number;
}

function readGuestQueue(): GuestQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeGuestQueue(items: GuestQueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // storage lleno / bloqueado → silencioso, el UX degrada a "prompt login".
  }
}

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
}

type Phase = "idle" | "adding" | "added" | "exists" | "error";

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
}: AddToTravelPlanButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchActive = useServerFn(getMyActivePlan);
  const addItem = useServerFn(addPlanItem);

  // Solo lee el plan activo si hay sesión; determina si el item ya existe.
  const { data: active } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const alreadyInPlan = useMemo(() => {
    if (!active?.items) return false;
    return active.items.some(
      (it) => it.item_kind === kind && it.target_id === targetId,
    );
  }, [active, kind, targetId]);

  const [phase, setPhase] = useState<Phase>("idle");
  useEffect(() => {
    if (alreadyInPlan && phase === "idle") setPhase("exists");
  }, [alreadyInPlan, phase]);

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
    onMutate: () => setPhase("adding"),
    onSuccess: (res) => {
      setPhase(res.created ? "added" : "exists");
      void queryClient.invalidateQueries({
        queryKey: ["traveler", "active-plan", user?.id],
      });
      toast.success(
        res.created ? "Agregado a Mi Viaje" : "Ya estaba en Mi Viaje",
        { description: title },
      );
    },
    onError: (e) => {
      setPhase("error");
      toast.error("No pudimos agregarlo a Mi Viaje", {
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
      });
    },
  });

  function handleGuest() {
    const queue = readGuestQueue();
    const dup = queue.some(
      (it) => it.kind === kind && it.targetId === targetId,
    );
    if (!dup) {
      queue.push({
        kind,
        targetId,
        title,
        slug: slug ?? null,
        imageUrl: imageUrl ?? null,
        subtitle: subtitle ?? null,
        notes: notes ?? null,
        ts: Date.now(),
      });
      writeGuestQueue(queue);
    }
    setPhase("added");
    toast("Guardado provisionalmente en tu dispositivo", {
      description: "Inicia sesión para sincronizarlo con Mi Viaje.",
      action: {
        label: "Iniciar sesión",
        onClick: () => {
          if (typeof window !== "undefined") window.location.href = "/auth";
        },
      },
    });
  }

  const busy = phase === "adding" || mutation.isPending;
  const done = phase === "added" || phase === "exists";

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
        if (!user) {
          handleGuest();
          return;
        }
        mutation.mutate();
      }}
      title={done ? "Ya está en Mi Viaje" : "Agregar a Mi Viaje"}
      className={[base, skin, className ?? ""].join(" ")}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : done ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Plus className="size-3.5" aria-hidden />
      )}
      <span>
        {busy
          ? "Agregando…"
          : phase === "exists"
            ? "En Mi Viaje"
            : phase === "added"
              ? "Agregado"
              : "Agregar a Mi Viaje"}
      </span>
    </button>
  );
}