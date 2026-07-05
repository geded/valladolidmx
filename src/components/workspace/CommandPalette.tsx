/**
 * CommandPalette — única superficie ⌘K del Workspace Engine.
 * Consume EXCLUSIVAMENTE el Navigation Registry y los commands
 * declarados por cada WorkspaceDefinition.
 */
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace } from "./WorkspaceProvider";
import { getNavItemsForWorkspace } from "@/lib/workspace/navigation-registry";
import { useAvailableActions, useWorkspaceContext } from "./context/WorkspaceContextProvider";

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, workspace, workspaces, setActiveWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const contextActions = useAvailableActions();
  const { workspaceId, selection, focused } = useWorkspaceContext();

  const navItems = useMemo(
    () => (workspace ? getNavItemsForWorkspace(workspace.id, "palette") : []),
    [workspace],
  );

  const commands = workspace?.commands ?? [];

  const runNav = (to: string) => {
    setPaletteOpen(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Busca destinos, acciones, workspaces… (⌘K)" data-allow-palette="true" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        {navItems.length > 0 ? (
          <CommandGroup heading={`Navegar · ${workspace?.shortLabel ?? workspace?.label ?? ""}`}>
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <CommandItem
                  key={it.id}
                  value={`nav ${it.label} ${it.to}`}
                  onSelect={() => runNav(it.to)}
                >
                  <Icon className="mr-2 h-4 w-4" aria-hidden />
                  <span>{it.label}</span>
                  {it.shortcut ? (
                    <kbd className="ml-auto text-xs text-muted-foreground">{it.shortcut}</kbd>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        {commands.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Acciones">
              {commands
                .filter((c) => (c.when ? c.when() : true))
                .map((c) => {
                  const Icon = c.icon;
                  return (
                    <CommandItem
                      key={c.id}
                      value={`cmd ${c.label} ${c.hint ?? ""}`}
                      onSelect={() =>
                        void c.run({
                          navigate: (to) => runNav(to),
                          setWorkspace: (id) => setActiveWorkspace(id),
                          closePalette: () => setPaletteOpen(false),
                        })
                      }
                    >
                      {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                      <span>{c.label}</span>
                      {c.shortcut ? (
                        <kbd className="ml-auto text-xs text-muted-foreground">{c.shortcut}</kbd>
                      ) : null}
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        ) : null}

        {contextActions.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Acciones contextuales">
              {contextActions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem
                    key={a.id}
                    value={`ctx ${a.label} ${a.scope}`}
                    onSelect={() => {
                      setPaletteOpen(false);
                      void a.run({ workspaceId, selection, focused });
                    }}
                  >
                    {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                    <span>{a.label}</span>
                    <kbd className="ml-auto text-[10px] text-muted-foreground">
                      {a.scope}
                    </kbd>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Cambiar de Workspace">
          {workspaces.map((w) => {
            const Icon = w.icon;
            return (
              <CommandItem
                key={w.id}
                value={`ws ${w.label}`}
                onSelect={() => {
                  setActiveWorkspace(w.id);
                  setPaletteOpen(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4" aria-hidden />
                <span>{w.label}</span>
                {w.id === workspace?.id ? (
                  <span className="ml-auto text-xs text-muted-foreground">activo</span>
                ) : null}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}