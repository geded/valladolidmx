/**
 * Estado del modo de perfil alineado con el panel actual.
 *
 * Todas las superficies (menú de usuario, cambio de modo y Mi Cuenta) leen
 * el modo desde aquí para que nunca se contradigan. Si la persona entra a un
 * panel de otro perfil (p. ej. el CMS estando guardado «Viajero»), el modo
 * mostrado cambia al instante y se guarda en segundo plano, sin navegar.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  getProfileModeState,
  setActiveMode,
  type ProfileMode,
  type ProfileModeState,
} from "./mode.functions";
import { effectiveMode, hidesTravelerSurfaces } from "./workspace-mode";

export const PROFILE_MODE_QUERY_KEY = ["profile-mode-state"] as const;

// Evita que varias superficies montadas a la vez guarden el mismo cambio.
let syncing: ProfileMode | null = null;

export function useProfileModeState(): {
  data: ProfileModeState | undefined;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchState = useServerFn(getProfileModeState);
  const persist = useServerFn(setActiveMode);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const query = useQuery({
    queryKey: PROFILE_MODE_QUERY_KEY,
    queryFn: () => fetchState(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const stored = query.data;
  const active = stored ? effectiveMode(pathname, stored.active, stored.available) : undefined;

  useEffect(() => {
    if (!stored || !active || active === stored.active || syncing === active) return;
    syncing = active;
    persist({ data: { mode: active } })
      .then((next) => qc.setQueryData(PROFILE_MODE_QUERY_KEY, next))
      .catch(() => undefined)
      .finally(() => {
        syncing = null;
      });
  }, [stored, active, persist, qc]);

  return {
    data: stored && active ? { ...stored, active } : undefined,
    isLoading: query.isLoading,
  };
}

/** true cuando la persona opera como Staff: sin Mi Viaje ni perfil de viajero. */
export function useHidesTravelerSurfaces(): boolean {
  const { data } = useProfileModeState();
  return Boolean(data && hidesTravelerSurfaces(data.active));
}
