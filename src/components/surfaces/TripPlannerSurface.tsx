/**
 * TripPlannerSurface — página pública "Arma tu Viaje" (Iniciativa 7 · Sub-ola D).
 *
 * Explica la funcionalidad pública y — si el usuario tiene sesión y un
 * plan activo, o hay elementos guardados como invitado — muestra un
 * resumen con CTA hacia el Workspace del Viajero (/cuenta/mi-viaje).
 *
 * Reglas:
 *  - "Arma tu Viaje" = funcionalidad pública (esta página).
 *  - "Mi Viaje" = espacio privado del viajero.
 *  - "Agregar a Mi Viaje" = acción disparada desde tarjetas.
 *  - Toda lectura pasa por travel-plans.functions.ts.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Compass, FileText, MessageCircle, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyActivePlan } from "@/lib/traveler/travel-plans.functions";
import { readGuestQueue } from "@/lib/traveler/guest-queue";

export function TripPlannerSurface() {
  const { user } = useAuth();
  const fetchActive = useServerFn(getMyActivePlan);

  const { data: active } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const [guestCount, setGuestCount] = useState(0);
  useEffect(() => {
    if (!user) setGuestCount(readGuestQueue().length);
    else setGuestCount(0);
  }, [user]);

  const itemCount = active?.items.length ?? 0;
  const showSummary = (user && itemCount > 0) || (!user && guestCount > 0);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { Icon: Compass, t: "Guarda lo que te interesa", d: "Destinos, hoteles, restaurantes, experiencias, eventos." },
          { Icon: FileText, t: "Anota lo importante", d: "Fechas, viajeros, presupuesto, preferencias." },
          { Icon: MessageCircle, t: "Tu concierge humano", d: "Recibe tu expediente cuando estés listo. Nunca antes." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      {showSummary ? (
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-8">
          <p className="text-xs uppercase tracking-wide text-primary">Tu Viaje</p>
          <h2 className="mt-1 text-2xl font-semibold">
            {user
              ? active?.plan.title ?? "Mi Viaje"
              : "Elementos guardados en este dispositivo"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? `Tienes ${itemCount} elemento${itemCount === 1 ? "" : "s"} en tu expediente.`
              : `Tienes ${guestCount} elemento${guestCount === 1 ? "" : "s"} guardado${guestCount === 1 ? "" : "s"} localmente. Inicia sesión para sincronizarlos con Mi Viaje.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? (
              <Link
                to="/cuenta/mi-viaje"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Abrir Mi Viaje
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Iniciar sesión y continuar
              </Link>
            )}
            <Link
              to="/oriente-maya"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Seguir explorando
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <PlusCircle className="size-3" aria-hidden /> Cómo funciona
          </span>
          <h2 className="mt-4 text-2xl">Empieza a armar tu viaje</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Explora el ecosistema y pulsa <strong>➕ Agregar a Mi Viaje</strong> en
            cualquier tarjeta. Todo se guarda en tu expediente privado, listo
            para enviarlo a tu concierge humano.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/oriente-maya"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium transition-all hover:bg-accent active:scale-[0.98]"
            >
              Explorar destinos
            </Link>
            {user ? (
              <Link
                to="/cuenta/mi-viaje"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
              >
                Ir a Mi Viaje
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}