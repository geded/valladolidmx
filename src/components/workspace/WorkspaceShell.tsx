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
import { WorkspaceContextProvider } from "./context/WorkspaceContextProvider";
import { SheetStackProvider } from "./sheets/SheetStackProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export interface WorkspaceShellProps {
  children: ReactNode;
  title?: string;
  inspector?: ReactNode;
  /** Si false, se omite el Inspector (algunos workspaces no lo necesitan). */
  showInspector?: boolean;
  className?: string;
  /** El contenido de la ruta aporta el h1; el título del chrome conserva sólo su estilo. */
  topbarTitleAsText?: boolean;
}

export function WorkspaceShell({
  children,
  title,
  inspector,
  showInspector = true,
  className,
  topbarTitleAsText = false,
}: WorkspaceShellProps) {
  const bp = useWorkspaceBreakpoint();
  const showSidebar = bp !== "xs" && bp !== "sm";

  return (
    <WorkspaceContextProvider>
      <SheetStackProvider>
        {/*
         * Altura estable: en navegadores móviles (iOS Safari) `100dvh` cambia
         * al ocultar/mostrar la barra del navegador y el área de trabajo
         * "salta" dejando un hueco en blanco. Usamos `100svh` (altura estable)
         * y conservamos `100dvh` sólo en escritorio, donde no varía.
         */}
        <div
          className={cn(
            "flex h-[100svh] w-full overflow-hidden bg-background text-foreground lg:h-[100dvh]",
            className,
          )}
        >
          {showSidebar ? <WorkspaceSidebar /> : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <WorkspaceTopbar title={title} titleAsText={topbarTitleAsText} />
            <main
              id="main"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              style={{
                paddingBottom:
                  bp === "xs" || bp === "sm"
                    ? "calc(56px + env(safe-area-inset-bottom))"
                    : undefined,
              }}
            >
              <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">{children}</div>
            </main>
          </div>
          {showInspector ? <WorkspaceInspector>{inspector}</WorkspaceInspector> : null}
          {!showSidebar ? <WorkspaceBottomNav /> : null}
          <CommandPalette />
          <Toaster position="top-right" richColors closeButton />
        </div>
      </SheetStackProvider>
    </WorkspaceContextProvider>
  );
}
