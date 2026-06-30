import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "./WorkspaceProvider";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { workspace, workspaces, setActiveWorkspace } = useWorkspace();
  if (!workspace) return null;
  const Icon = workspace.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm transition",
            "hover:bg-surface-raised hover:border-border-strong",
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          {!compact ? (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold leading-tight">
                {workspace.shortLabel ?? workspace.label}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Workspace
              </span>
            </span>
          ) : null}
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((w) => {
          const I = w.icon;
          return (
            <DropdownMenuItem key={w.id} onClick={() => setActiveWorkspace(w.id)}>
              <I className="mr-2 h-4 w-4" aria-hidden />
              <span className="flex-1">{w.label}</span>
              {w.id === workspace.id ? (
                <span className="text-xs text-muted-foreground">activo</span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}