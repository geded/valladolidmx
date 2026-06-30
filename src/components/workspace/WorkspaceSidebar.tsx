/**
 * WorkspaceSidebar — adaptable: expanded (256) | rail (64) | hidden | floating.
 * Lee Items exclusivamente del Navigation Registry.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  getNavItemsForWorkspace,
  groupNavItems,
} from "@/lib/workspace/navigation-registry";
import { cn } from "@/lib/utils";

const WIDTH = {
  expanded: "w-64",
  rail: "w-[64px]",
  hidden: "w-0",
  floating: "w-64",
} as const;

export function WorkspaceSidebar() {
  const { workspace, sidebar, toggleSidebar } = useWorkspace();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!workspace || sidebar === "hidden") return null;
  const collapsed = sidebar === "rail";
  const items = getNavItemsForWorkspace(workspace.id, "sidebar");
  const grouped = groupNavItems(items);

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        WIDTH[sidebar],
      )}
      aria-label={`${workspace.label} · navegación`}
    >
      <div className="p-2">
        <WorkspaceSwitcher compact={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {Object.entries(grouped).map(([group, list]) => (
          <div key={group} className="mt-2">
            {!collapsed ? (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group}
              </div>
            ) : (
              <div className="my-1 h-px bg-divider" />
            )}
            <ul className="space-y-0.5">
              {list.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.id}>
                    <Link
                      to={it.to}
                      title={collapsed ? it.label : undefined}
                      className={cn(
                        "flex min-h-[44px] items-center gap-3 rounded-xl px-2 text-sm transition",
                        active
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        collapsed && "justify-center",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {!collapsed ? <span className="truncate">{it.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={toggleSidebar}
        className="mx-2 mb-2 flex h-9 items-center justify-center gap-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-sidebar-accent"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4" aria-hidden />
            <span>Colapsar</span>
          </>
        )}
      </button>
    </aside>
  );
}