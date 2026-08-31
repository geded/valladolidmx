/**
 * Adaptador mínimo Home Premium → Travel Plan canónico.
 *
 * Una ruta editorial no es una entidad ni un kind del dominio; se conserva
 * como `note`, capacidad ya soportada por Travel Plan y por la continuidad
 * anónima→cuenta. No crea store, kind, RPC ni migración paralelos.
 */
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { addPlanItem } from "@/lib/traveler/travel-plans.functions";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft";
import { notifyPlanChanged } from "@/lib/alux/plan-signals";
import type { HomePremiumRoute } from "./home-premium-content";

export interface AddHomeRouteToTravelPlanButtonProps {
  route: HomePremiumRoute;
  variant?: "outline" | "primary";
  addLabel?: string;
  addedLabel?: string;
}

export function AddHomeRouteToTravelPlanButton({
  route,
  variant = "outline",
  addLabel = "Agregar ruta a mi viaje",
  addedLabel = "Ruta agregada",
}: AddHomeRouteToTravelPlanButtonProps) {
  const { user } = useAuth();
  const anon = useAnonymousTrip();
  const addItem = useServerFn(addPlanItem);
  const queryClient = useQueryClient();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const noteKey = `home-premium-route:${route.id}`;
  const alreadyAnonymous = useMemo(
    () =>
      Boolean(
        anon.trip?.plannedItems.some(
          (item) => item.kind === "note" && item.targetId === noteKey,
        ),
      ),
    [anon.trip, noteKey],
  );
  const [addedAuthenticated, setAddedAuthenticated] = useState(false);
  const added = user?.id ? addedAuthenticated : alreadyAnonymous;

  async function handleAdd() {
    if (busyRef.current || added) return;
    busyRef.current = true;
    setBusy(true);
    const notes = [
      `Ruta: ${route.title}`,
      `Duración: ${route.duration}`,
      `${route.stops} paradas`,
      `Secuencia: ${route.sequence.join(" → ")}`,
      noteKey,
    ].join("\n");

    try {
      if (user?.id) {
        await addItem({
          data: {
            kind: "note",
            targetId: null,
            notes,
            snapshot: {
              title: route.title,
              subtitle: `${route.duration} · ${route.stops} paradas`,
            },
          },
        });
        setAddedAuthenticated(true);
        await queryClient.invalidateQueries({
          queryKey: ["traveler", "active-plan", user.id],
        });
        notifyPlanChanged("add_item");
      } else {
        const result = await anon.addPlannedItem({
          kind: "note",
          targetId: noteKey,
          title: route.title,
          subtitle: `${route.duration} · ${route.stops} paradas`,
          notes,
        });
        if (!result.ok) throw new Error("Límite de elementos alcanzado.");
      }
      toast("Ruta agregada a Mi Viaje", {
        description: "Alux podrá personalizarla con tu perfil y tus señales de viaje.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar la ruta.");
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  return (
    <Button
      type="button"
      variant={variant === "outline" ? "outline" : "default"}
      size={variant === "primary" ? "lg" : "default"}
      onClick={() => void handleAdd()}
      disabled={busy || added}
      aria-pressed={added}
      className={variant === "primary" ? "min-h-12 rounded-pill" : "min-h-11 rounded-pill"}
    >
      {busy ? (
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
      ) : added ? (
        <Check className="mr-2 size-4" aria-hidden />
      ) : (
        <Compass className="mr-2 size-4" aria-hidden />
      )}
      {busy ? "Agregando…" : added ? addedLabel : addLabel}
    </Button>
  );
}
