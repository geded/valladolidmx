/**
 * ProfileModeSwitcher — E-PS · US-EPS.2
 *
 * Al estilo Airbnb: dentro del menú de usuario aparece un submenú
 * "Cambiar de modo" con las opciones que el usuario tiene realmente
 * disponibles (Viajero, Empresa, Concierge, Staff). El modo activo
 * persiste en `profiles.active_mode` vía el RPC `set_active_mode`.
 *
 * Este componente NO reasigna rutas ni cambia la home — sólo actualiza
 * la preferencia. La integración con superficies (portal/cms/concierge)
 * seguirá siendo por URL directa; el switcher es aditivo.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, Check, Compass, Headphones, Shield } from "lucide-react";
import {
  getProfileModeState,
  setActiveMode,
  type ProfileMode,
} from "@/lib/profile-mode/mode.functions";

const MODE_META: Record<
  ProfileMode,
  { label: string; description: string; Icon: typeof Compass }
> = {
  traveler: {
    label: "Viajero",
    description: "Explora, guarda favoritos y arma tu viaje.",
    Icon: Compass,
  },
  business: {
    label: "Empresa",
    description: "Administra tu(s) negocio(s) y publicaciones.",
    Icon: Briefcase,
  },
  concierge: {
    label: "Concierge",
    description: "Atiende solicitudes de viajeros.",
    Icon: Headphones,
  },
  staff: {
    label: "Staff",
    description: "Panel editorial e interno.",
    Icon: Shield,
  },
};

// US-EPS.4 — Landing canónico por modo. Home pública permanece fija (/);
// tras el switch enviamos al usuario al espacio de trabajo del modo elegido,
// como hace Airbnb al alternar entre "Traveling" y "Hosting".
const MODE_LANDING: Record<ProfileMode, string> = {
  traveler: "/",
  business: "/portal",
  concierge: "/concierge",
  staff: "/cms",
};

export function ProfileModeSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchState = useServerFn(getProfileModeState);
  const persist = useServerFn(setActiveMode);

  const state = useQuery({
    queryKey: ["profile-mode-state"],
    queryFn: () => fetchState(),
    staleTime: 60_000,
  });

  const mutate = useMutation({
    mutationFn: (mode: ProfileMode) => persist({ data: { mode } }),
    onSuccess: (next, mode) => {
      qc.setQueryData(["profile-mode-state"], next);
      onSwitched?.();
      const target = MODE_LANDING[mode];
      if (target) navigate({ to: target }).catch(() => undefined);
    },
  });

  if (state.isLoading || !state.data) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">Cargando modos…</div>
    );
  }

  const { active, available } = state.data;

  // Airbnb-style: si sólo hay 1 modo disponible (traveler puro) mostramos
  // un CTA "Convierte tu negocio en anfitrión" en vez del submenú.
  if (available.length <= 1) {
    return (
      <Link
        to="/cuenta/anfitrion"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSwitched?.()}
        className="flex items-start gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-accent"
      >
        <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">
            Convierte tu negocio en anfitrión
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Publica tu hotel, restaurante o experiencia en el Oriente Maya.
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div className="border-b border-border py-1">
      <div className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Cambiar de modo
      </div>
      {available.map((mode) => {
        const { label, description, Icon } = MODE_META[mode];
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            role="menuitemradio"
            aria-checked={isActive}
            disabled={mutate.isPending || isActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => mutate.mutate(mode)}
            className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-100 ${
              isActive ? "bg-accent/50" : ""
            }`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium">
                {label}
                {isActive && <Check className="size-3.5 text-primary" aria-hidden />}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {description}
              </span>
            </span>
          </button>
        );
      })}
      {mutate.error instanceof Error && (
        <div className="px-3 pb-1 text-[11px] text-destructive">
          {mutate.error.message}
        </div>
      )}
    </div>
  );
}