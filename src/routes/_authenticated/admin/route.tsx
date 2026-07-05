/**
 * /_authenticated/admin — Workspace "founder" (Adenda 15.10.5c.5 · Ola 5).
 *
 * Migrado al Workspace Engine v2.0. Toda la estructura visual
 * (sidebar, topbar, inspector, command palette, bottom-nav, sheets,
 * toasts) proviene del Workspace Engine y de los Registries oficiales.
 * Se preserva el gate de UX por rol fundador (la autorización dura
 * sigue ocurriendo server-side en cada server function, p.ej.
 * founder_dashboard_kpis exige super_admin o admin).
 */
import { useEffect, useMemo } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { resolveRoleHome, type AppRole } from "@/types/auth";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

const ADMIN_ROLES: AppRole[] = ["super_admin", "admin"];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = useMemo(
    () => roles.some((r) => ADMIN_ROLES.includes(r)),
    [roles],
  );

  // Si el usuario está autenticado pero no tiene rol admin, en lugar de
  // mostrar 403 lo enviamos silenciosamente al panel que sí le corresponde
  // (Airbnb-style: nunca dejamos al usuario en una pared sin salida).
  useEffect(() => {
    if (!loading && !allowed) {
      const home = resolveRoleHome(roles);
      void navigate({ to: home, replace: true });
    }
  }, [loading, allowed, roles, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Redirigiendo…</p>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialWorkspaceId="founder">
      <WorkspaceShell title="Panel Fundador">
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}