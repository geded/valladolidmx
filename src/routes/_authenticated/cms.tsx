/**
 * /_authenticated/cms — Workspace "cms" (Adenda 15.10.5c.4 · Ola 4).
 *
 * Migrado al Workspace Engine v2.0. Toda la estructura visual
 * (sidebar, topbar, inspector, command palette, bottom-nav, sheets,
 * toasts) proviene del Workspace Engine y de los Registries oficiales.
 * Sólo se preserva el gate de UX por rol editorial (la autorización
 * dura sigue ocurriendo server-side en cada server function).
 */
import { useMemo } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { type AppRole } from "@/types/auth";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

const EDITORIAL_ROLES: AppRole[] = ["super_admin", "admin", "editor"];

export const Route = createFileRoute("/_authenticated/cms")({
  component: CmsLayout,
});

function CmsLayout() {
  const { roles } = useAuth();
  const isEditorial = useMemo(
    () => roles.some((r) => EDITORIAL_ROLES.includes(r)),
    [roles],
  );

  if (!isEditorial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            403
          </p>
          <h1 className="mt-2 text-3xl">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            El CMS Studio está reservado a los roles editoriales de
            Valladolid.mx. Si crees que deberías tener acceso, contacta al
            administrador del Blueprint.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialWorkspaceId="cms">
      <WorkspaceShell title="CMS Studio">
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}