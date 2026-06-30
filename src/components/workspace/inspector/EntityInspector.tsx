import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { useWorkspace } from "../WorkspaceProvider";
import { useFocusedEntity } from "../context/WorkspaceContextProvider";
import { resolveInspector } from "./registry";
import { EmptyInspector } from "./EmptyInspector";

export function EntityInspector() {
  const { workspace } = useWorkspace();
  const { focused } = useFocusedEntity();

  if (!workspace || !focused) return <EmptyInspector />;
  const view = resolveInspector(workspace.id, focused);

  return (
    <section
      className="flex h-full flex-col gap-3 border-l border-border bg-surface p-4"
      aria-label="Inspector de entidad"
    >
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Info className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {focused.type}
          </div>
          <div className="truncate font-display text-sm">
            {focused.label ?? focused.id}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto text-sm">
        {view ? (
          (view.render(focused) as ReactNode)
        ) : (
          <p className="text-muted-foreground">
            Sin vista de inspector registrada para <code>{focused.type}</code>.
          </p>
        )}
      </div>
    </section>
  );
}