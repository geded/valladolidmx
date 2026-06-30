/**
 * WorkspaceBottomNav — barra inferior móvil de 5 destinos.
 * Centro reservado para acción primaria del workspace (NavItem.primary).
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import { getNavItemsForWorkspace } from "@/lib/workspace/navigation-registry";
import { BottomSheet } from "./BottomSheet";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceBottomNav() {
  const { workspace, setPaletteOpen } = useWorkspace();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  if (!workspace) return null;
  const all = getNavItemsForWorkspace(workspace.id, "bottom");
  const primary = all.find((i) => i.primary);
  const others = all.filter((i) => i !== primary).slice(0, 3);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label={`${workspace.label} · navegación inferior`}
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {others.slice(0, 2).map((it) => (
            <BottomItem key={it.id} item={it} active={pathname === it.to} />
          ))}
          <li className="relative -mt-5 flex justify-center">
            {primary ? (
              <Link
                to={primary.to}
                className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground ws-shadow-raised"
                aria-label={primary.label}
              >
                <primary.icon className="h-5 w-5" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground ws-shadow-raised"
                aria-label="Acción rápida"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
            )}
          </li>
          {others.slice(2, 3).map((it) => (
            <BottomItem key={it.id} item={it} active={pathname === it.to} />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        snap="half"
        title="Navegación"
        description="Cambia de Workspace o accede a todas las áreas."
      >
        <div className="mb-3">
          <WorkspaceSwitcher />
        </div>
        <ul className="space-y-1">
          {all.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.id}>
                <Link
                  to={it.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted"
                >
                  <Icon className="h-4 w-4" aria-hidden /> {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

function BottomItem({
  item,
  active,
}: {
  item: ReturnType<typeof getNavItemsForWorkspace>[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        className={cn(
          "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px]",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "absolute top-0 h-0.5 w-8 rounded-full transition",
            active ? "bg-primary" : "bg-transparent",
          )}
          aria-hidden
        />
        <Icon className="h-5 w-5" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}