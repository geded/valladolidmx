import { Command, Sparkles, PanelRight } from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ConnectivityIndicator } from "./ConnectivityIndicator";
import { cn } from "@/lib/utils";

export function WorkspaceTopbar({ title }: { title?: string }) {
  const { setPaletteOpen, inspector, setInspector, workspace } = useWorkspace();

  const inspectorOpen = inspector !== "closed";

  return (
    <header
      className={cn(
        "flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur md:h-16 md:px-4",
      )}
    >
      <div className="md:hidden">
        <WorkspaceSwitcher compact />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base md:text-lg">
          {title ?? workspace?.label ?? "Workspace"}
        </h1>
      </div>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-raised md:inline-flex"
      >
        <Command className="h-3.5 w-3.5" aria-hidden />
        <span>Buscar o ejecutar…</span>
        <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Abrir Command Palette"
        className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted md:hidden"
      >
        <Command className="h-4 w-4" aria-hidden />
      </button>
      <ConnectivityIndicator />
      <button
        type="button"
        onClick={() => setInspector(inspectorOpen ? "closed" : "docked")}
        aria-pressed={inspectorOpen}
        aria-label="Alternar Copiloto"
        className={cn(
          "grid size-10 place-items-center rounded-full transition",
          inspectorOpen
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setInspector(inspectorOpen ? "closed" : "docked")}
        aria-label="Alternar inspector"
        className="hidden size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted md:grid"
      >
        <PanelRight className="h-4 w-4" aria-hidden />
      </button>
    </header>
  );
}