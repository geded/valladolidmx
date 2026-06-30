/**
 * WorkspaceInspector — panel contextual del workspace.
 * Forma según breakpoint: docked (lg+), drawer (md), sheet (xs/sm).
 * Por defecto, el modo "Copiloto Alux" es transversal — los workspaces
 * pueden inyectar contenido propio vía children.
 */
import type { ReactNode } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { useWorkspaceBreakpoint, isTouchBreakpoint } from "./hooks/useWorkspaceBreakpoint";
import { BottomSheet } from "./BottomSheet";
import { AluxCopilotPanel } from "./AluxCopilotPanel";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface WorkspaceInspectorProps {
  children?: ReactNode;
  /** Si false, se renderiza el AluxCopilotPanel por defecto. */
  copilotByDefault?: boolean;
  className?: string;
}

export function WorkspaceInspector({
  children,
  copilotByDefault = true,
  className,
}: WorkspaceInspectorProps) {
  const { inspector, setInspector } = useWorkspace();
  const bp = useWorkspaceBreakpoint();

  const content = children ?? (copilotByDefault ? <AluxCopilotPanel /> : null);
  const open = inspector !== "closed";

  if (!open) return null;

  // xs/sm: bottom sheet
  if (bp === "xs" || bp === "sm") {
    return (
      <BottomSheet
        open={open}
        onOpenChange={(o) => setInspector(o ? "sheet" : "closed")}
        snap="full"
      >
        {content}
      </BottomSheet>
    );
  }

  // md / iPad portrait: drawer derecho
  if (bp === "md") {
    return (
      <Sheet open={open} onOpenChange={(o) => setInspector(o ? "drawer" : "closed")}>
        <SheetContent side="right" className="w-[380px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Inspector</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // lg+: panel acoplado
  return (
    <aside
      className={cn(
        "hidden h-full w-[360px] shrink-0 lg:flex xl:w-[420px]",
        className,
      )}
      aria-label="Inspector"
    >
      {content}
    </aside>
  );

  // touchpad helper (sin usar fuera): silencia lint si se desea.
  void isTouchBreakpoint;
}