import { useMemo } from "react";
import { Command, Sparkles, PanelRight, ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useWorkspace } from "./WorkspaceProvider";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ConnectivityIndicator } from "./ConnectivityIndicator";
import { getNavItemsForWorkspace } from "@/lib/workspace/navigation-registry";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/UserMenu";

/** Humaniza un segmento de URL para usarlo como crumb. */
function humanizeSegment(seg: string): string {
  const decoded = decodeURIComponent(seg);
  // Ids largos / UUIDs: mostrar prefijo compacto.
  if (/^[0-9a-f-]{16,}$/i.test(decoded)) return "Detalle";
  const map: Record<string, string> = {
    nueva: "Nueva",
    nuevo: "Nuevo",
    editar: "Editar",
    moderar: "Moderar",
    pages: "Páginas",
    "experience-builder": "Editor de páginas",
  };
  if (map[decoded]) return map[decoded];
  const label = decoded.replace(/[-_]+/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface Crumb {
  label: string;
  to?: string;
}

export function WorkspaceTopbar({ title }: { title?: string }) {
  const { setPaletteOpen, inspector, setInspector, workspace } = useWorkspace();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const inspectorOpen = inspector !== "closed";

  const { crumbs, parentTo } = useMemo<{ crumbs: Crumb[]; parentTo: string | null }>(() => {
    if (!workspace) return { crumbs: [], parentTo: null };
    const navItems = [
      ...getNavItemsForWorkspace(workspace.id, "sidebar"),
      ...getNavItemsForWorkspace(workspace.id, "bottom"),
      ...getNavItemsForWorkspace(workspace.id, "palette"),
    ];
    // Dedupe by id, orden por longitud de "to" descendente para match más específico primero.
    const uniq = Array.from(new Map(navItems.map((i) => [i.id, i])).values()).sort(
      (a, b) => b.to.length - a.to.length,
    );
    // Raíz del workspace (item primario o el más corto).
    const rootItem =
      uniq.find((i) => i.primary) ??
      [...uniq].sort((a, b) => a.to.length - b.to.length)[0];
    const rootTo = rootItem?.to ?? "/";
    const rootLabel = workspace.label;

    // Match del nav item más específico cuyo "to" sea prefijo de pathname.
    const matched = uniq.find(
      (i) => pathname === i.to || pathname.startsWith(i.to.endsWith("/") ? i.to : i.to + "/"),
    );

    const list: Crumb[] = [{ label: rootLabel, to: rootTo }];
    let parent: string | null = null;

    if (matched && matched.to !== rootTo) {
      list.push({ label: matched.label, to: matched.to });
      parent = rootTo;
    }

    const base = matched?.to ?? rootTo;
    if (pathname !== base) {
      const rest = pathname
        .slice(base.length)
        .split("/")
        .filter(Boolean);
      rest.forEach((seg, idx) => {
        const isLast = idx === rest.length - 1;
        list.push({
          label: humanizeSegment(seg),
          to: isLast ? undefined : `${base}/${rest.slice(0, idx + 1).join("/")}`,
        });
      });
      // Padre inmediato = el nav item matched, o el crumb previo si hay más de un segmento.
      if (rest.length > 1) {
        parent = `${base}/${rest.slice(0, rest.length - 1).join("/")}`;
      } else {
        parent = base;
      }
    }

    return { crumbs: list, parentTo: parent };
  }, [workspace, pathname]);

  const canGoBack = Boolean(parentTo);
  const handleBack = () => {
    // Preferir historial del navegador si aplica; fallback a parentTo.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    if (parentTo) router.navigate({ to: parentTo });
  };

  return (
    <header
      className={cn(
        "relative z-40 flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur md:h-16 md:px-4",
      )}
    >
      <div className="md:hidden">
        <WorkspaceSwitcher compact />
      </div>
      {canGoBack ? (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Regresar"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        {crumbs.length > 1 ? (
          <nav aria-label="Ruta" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1 text-sm">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <li key={i} className={cn("flex min-w-0 items-center gap-1", isLast ? "shrink" : "shrink-0")}>
                    {i > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                    ) : null}
                    {isLast || !c.to ? (
                      <span
                        aria-current={isLast ? "page" : undefined}
                        className={cn(
                          "truncate",
                          isLast ? "font-display text-base text-foreground md:text-lg" : "text-muted-foreground",
                        )}
                      >
                        {c.label}
                      </span>
                    ) : (
                      <Link
                        to={c.to}
                        className="truncate rounded px-1 text-muted-foreground transition hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          <h1 className="truncate font-display text-base md:text-lg">
            {title ?? workspace?.label ?? "Workspace"}
          </h1>
        )}
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
      <div className="ml-1">
        <UserMenu />
      </div>
    </header>
  );
}