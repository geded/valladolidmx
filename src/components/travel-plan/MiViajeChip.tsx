/**
 * MiViajeChip — CV5.1.3
 *
 * Chip persistente "❤️ Mi Viaje" alojado en el SiteHeader global. Sólo se
 * renderiza cuando hay sesión y (a) el viajero tiene ítems en su plan
 * activo o (b) tiene un viaje confirmado con folio. Es un `<Link>` al
 * workspace único `/cuenta/mi-viaje`.
 *
 * Reutiliza el mismo `queryKey` que `FloatingTravelPlanDock` para compartir
 * caché de React Query (una sola lectura de `getMyActivePlan` y
 * `getMyConfirmedTravel` por sesión).
 *
 * Cero infra nueva: consume server fns existentes y responde al bus
 * `alux:plan-changed` para refresco inmediato.
 */
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyActivePlan } from "@/lib/traveler/travel-plans.functions";
import { getMyConfirmedTravel } from "@/lib/concierge/orders.functions";
import { onPlanChanged } from "@/lib/alux/plan-signals";
import { cn } from "@/lib/utils";

interface Props {
  isOverlay?: boolean;
}

export function MiViajeChip({ isOverlay = false }: Props) {
  const { user } = useAuth();
  const enabled = !!user;

  const fetchActive = useServerFn(getMyActivePlan);
  const activeQ = useQuery({
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

  useEffect(() => {
    if (!enabled) return;
    return onPlanChanged(() => {
      void activeQ.refetch();
      void confirmedQ.refetch();
    });
  }, [enabled, activeQ, confirmedQ]);

  if (!enabled) return null;

  const count = activeQ.data?.items.length ?? 0;
  const confirmed = confirmedQ.data ?? null;
  const isConfirmed = !!confirmed && confirmed.status !== "refunded";

  if (count === 0 && !isConfirmed) return null;

  const label = isConfirmed ? confirmed!.folio : "Mi Viaje";
  const badge = isConfirmed ? null : count;

  return (
    <Link
      to="/cuenta/mi-viaje"
      aria-label={
        isConfirmed
          ? `Mi Viaje · Folio ${confirmed!.folio}`
          : `Mi Viaje · ${count} elemento${count === 1 ? "" : "s"}`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium tracking-tight transition-all active:scale-[0.98]",
        isConfirmed
          ? isOverlay
            ? "border-emerald-300/60 bg-emerald-500/15 text-white hover:bg-emerald-500/25"
            : "border-success/40 bg-success/10 text-success hover:bg-success/15"
          : isOverlay
            ? "border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      {isConfirmed ? (
        <CheckCircle2 className="size-3.5" aria-hidden />
      ) : (
        <Heart className="size-3.5 fill-current" aria-hidden />
      )}
      <span className="hidden sm:inline">{label}</span>
      {badge !== null && badge > 0 ? (
        <span
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-none",
            isOverlay
              ? "bg-white/20 text-white"
              : "bg-primary/20 text-primary",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
