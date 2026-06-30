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

export const Route = createFileRoute("/_authenticated/cuenta")({
  component: CuentaWorkspaceRoute,
});

function CuentaWorkspaceRoute() {
  return (
    <WorkspaceProvider initialWorkspaceId="cuenta">
      <WorkspaceShell title="Mi Cuenta">
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}