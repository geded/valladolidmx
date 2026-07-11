/**
 * /_authenticated/cuenta — Workspace "cuenta" (Adenda 15.10.5c.1 · Ola 1).
 *
 * Migrado 1:1 al Workspace Engine v2.0. El layout local previo
 * (sidebar + nav propios) fue eliminado para cumplir Workspace First
 * Policy: navegación, sidebar, topbar, inspector, command palette y
 * sheets se consumen exclusivamente desde el Workspace Engine y los
 * registries oficiales. Sin cambios funcionales (paridad 1:1).
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getMyTravelerProfile } from "@/lib/traveler/traveler-account.functions";
import { getProfileModeState } from "@/lib/profile-mode/mode.functions";
import { WelcomeOnboardingModal } from "@/components/traveler/WelcomeOnboardingModal";

export const Route = createFileRoute("/_authenticated/cuenta")({
  component: CuentaWorkspaceRoute,
});

function CuentaWorkspaceRoute() {
  return (
    <WorkspaceProvider initialWorkspaceId="cuenta">
      <WorkspaceShell title="Mi Cuenta">
        <TravelerOnboardingMount />
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

function TravelerOnboardingMount() {
  const { user } = useAuth();
  const fetchMode = useServerFn(getProfileModeState);
  const fetchProfile = useServerFn(getMyTravelerProfile);
  const modeQ = useQuery({
    queryKey: ["profile-mode-state"],
    queryFn: () => fetchMode(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const isTraveler = (modeQ.data?.active ?? "traveler") === "traveler";
  const profileQ = useQuery({
    queryKey: ["traveler", "profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id) && isTraveler,
    staleTime: 60_000,
  });
  if (!user?.id || !isTraveler) return null;
  return (
    <WelcomeOnboardingModal
      profile={profileQ.data}
      ready={!profileQ.isLoading && profileQ.isFetched}
    />
  );
}