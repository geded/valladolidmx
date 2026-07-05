/**
 * /_authenticated/concierge — Workspace "concierge" (Adenda 15.10.5c.2 · Ola 2).
 *
 * Layout migrado al Workspace Engine v2.0. Toda la estructura visual
 * (sidebar, topbar, inspector, command palette, bottom-nav, sheets)
 * procede del Workspace Engine y de los Registries oficiales.
 * Sin cambios funcionales (paridad 1:1).
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { type AppRole } from "@/types/auth";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

const CONCIERGE_ROLES: AppRole[] = ["super_admin", "admin", "concierge", "concierge_lead"];

export const Route = createFileRoute("/_authenticated/concierge")({
  component: ConciergeWorkspaceRoute,
});

function ConciergeWorkspaceRoute() {
  const { roles } = useAuth();
  const allowed = useMemo(
    () => roles.some((r) => CONCIERGE_ROLES.includes(r)),
    [roles],
  );

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">403</p>
          <h1 className="mt-2 text-3xl">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            El Centro Concierge está reservado para el equipo de atención y operación.
          </p>
          <Link
            to="/cuenta/mi-viaje"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Volver a Mi Viaje
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialWorkspaceId="concierge">
      <WorkspaceShell title="Centro Concierge">
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}