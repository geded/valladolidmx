/**
 * WorkspaceShell — layout responsivo del Workspace Engine.
 *
 * Tres planos (switcher · áreas · vista) + Inspector contextual.
 * Compone: Topbar · Sidebar (desktop/tablet) · Main · Inspector · BottomNav (móvil) · CommandPalette.
 */
import type { ReactNode } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceBottomNav } from "./WorkspaceBottomNav";
import { WorkspaceTopbar } from "./WorkspaceTopbar";
import { WorkspaceInspector } from "./WorkspaceInspector";
import { CommandPalette } from "./CommandPalette";
import { useWorkspaceBreakpoint } from "./hooks/useWorkspaceBreakpoint";
import { cn } from "@/lib/utils";

export interface WorkspaceShellProps {
  children: ReactNode;
  title?: string;
  inspector?: ReactNode;
  /** Si false, se omite el Inspector (algunos workspaces no lo necesitan). */
  showInspector?: boolean;
  className?: string;
}

export function WorkspaceShell({
  children,
  title,
  inspector,
  showInspector = true,
  className,
}: WorkspaceShellProps) {
  const bp = useWorkspaceBreakpoint();
  const showSidebar = bp !== "xs" && bp !== "sm";

  return (
    <div className={cn("flex h-[100dvh] w-full bg-background text-foreground", className)}>
      {showSidebar ? <WorkspaceSidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopbar title={title} />
        <main
          id="main"
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ paddingBottom: bp === "xs" || bp === "sm" ? "calc(56px + env(safe-area-inset-bottom))" : undefined }}
        >
          <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">{children}</div>
        </main>
      </div>
      {showInspector ? <WorkspaceInspector>{inspector}</WorkspaceInspector> : null}
      {!showSidebar ? <WorkspaceBottomNav /> : null}
      <CommandPalette />
    </div>
  );
}