/**
 * /_authenticated/concierge — Workspace "concierge" (Adenda 15.10.5c.2 · Ola 2).
 *
 * Layout migrado al Workspace Engine v2.0. Toda la estructura visual
 * (sidebar, topbar, inspector, command palette, bottom-nav, sheets)
 * procede del Workspace Engine y de los Registries oficiales.
 * Sin cambios funcionales (paridad 1:1).
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const Route = createFileRoute("/_authenticated/concierge")({
  component: ConciergeWorkspaceRoute,
});

function ConciergeWorkspaceRoute() {
  return (
    <WorkspaceProvider initialWorkspaceId="concierge">
      <WorkspaceShell title="Centro Concierge">
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}