import { CheckSquare2 } from "lucide-react";
import {
  useSelection,
  useAvailableActions,
  useWorkspaceContext,
} from "../context/WorkspaceContextProvider";
import { Button } from "@/components/ui/button";

export function SelectionInspector() {
  const { selection, clear } = useSelection();
  const { workspaceId, focused } = useWorkspaceContext();
  const actions = useAvailableActions().filter((a) => a.scope === "selection");

  return (
    <section
      className="flex h-full flex-col gap-3 border-l border-border bg-surface p-4"
      aria-label="Inspector de selección"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <CheckSquare2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Selección
            </div>
            <div className="font-display text-sm">
              {selection.length} elemento{selection.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={clear}>
          Limpiar
        </Button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-surface-raised p-2 text-sm">
        {selection.map((r) => (
          <li
            key={`${r.type}:${r.id}`}
            className="flex items-center justify-between gap-2 px-2 py-1.5"
          >
            <span className="truncate">{r.label ?? r.id}</span>
            <span className="text-[11px] text-muted-foreground">{r.type}</span>
          </li>
        ))}
      </ul>
      {actions.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Acciones masivas
          </div>
          {actions.map((a) => (
            <Button
              key={a.id}
              size="sm"
              className="w-full justify-start"
              variant="outline"
              onClick={() =>
                void a.run({ workspaceId, selection, focused })
              }
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}