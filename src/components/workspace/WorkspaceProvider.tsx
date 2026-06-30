/**
 * WorkspaceProvider — estado global del Workspace Engine.
 *
 * Posee: workspace activo, estado del sidebar/inspector, densidad,
 * paleta abierta. Persiste preferencias en localStorage (clave
 * `vmx.workspace.prefs`) y sólo accede a window dentro de useEffect.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { bootstrapWorkspaceDefinitions } from "@/lib/workspace/definitions";
import { getWorkspace, listWorkspaces } from "@/lib/workspace/workspace-registry";
import type { WorkspaceDefinition } from "@/lib/workspace/types";

export type SidebarState = "expanded" | "rail" | "hidden" | "floating";
export type InspectorState = "docked" | "drawer" | "sheet" | "closed";
export type Density = "comfortable" | "compact";

interface Prefs {
  sidebar: SidebarState;
  inspector: InspectorState;
  density: Density;
  activeWorkspaceId: string;
}

const DEFAULT_PREFS: Prefs = {
  sidebar: "expanded",
  inspector: "closed",
  density: "comfortable",
  activeWorkspaceId: "founder",
};

const STORAGE_KEY = "vmx.workspace.prefs";

interface Ctx {
  workspace: WorkspaceDefinition | undefined;
  workspaces: WorkspaceDefinition[];
  setActiveWorkspace: (id: string) => void;
  sidebar: SidebarState;
  setSidebar: (s: SidebarState) => void;
  toggleSidebar: () => void;
  inspector: InspectorState;
  setInspector: (s: InspectorState) => void;
  density: Density;
  setDensity: (d: Density) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const WorkspaceCtx = createContext<Ctx | null>(null);

export function WorkspaceProvider({
  children,
  initialWorkspaceId,
}: {
  children: ReactNode;
  initialWorkspaceId?: string;
}) {
  // Registro idempotente.
  bootstrapWorkspaceDefinitions();

  const [prefs, setPrefs] = useState<Prefs>({
    ...DEFAULT_PREFS,
    ...(initialWorkspaceId ? { activeWorkspaceId: initialWorkspaceId } : {}),
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Cargar prefs de localStorage tras hidratación.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefs((p) => ({ ...p, ...parsed }));
      }
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  // Persistir.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs, hydrated]);

  // Aplicar densidad al <html data-density>.
  useEffect(() => {
    document.documentElement.setAttribute("data-density", prefs.density);
  }, [prefs.density]);

  // Atajo global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const tgt = e.target as HTMLElement | null;
        const editable =
          tgt &&
          (tgt.isContentEditable ||
            tgt.tagName === "INPUT" ||
            tgt.tagName === "TEXTAREA");
        if (!editable || (tgt as HTMLElement).getAttribute("data-allow-palette") === "true") {
          e.preventDefault();
          setPaletteOpen((o) => !o);
        }
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<Ctx>(() => {
    const ws = getWorkspace(prefs.activeWorkspaceId);
    return {
      workspace: ws,
      workspaces: listWorkspaces(),
      setActiveWorkspace: (id) => setPrefs((p) => ({ ...p, activeWorkspaceId: id })),
      sidebar: prefs.sidebar,
      setSidebar: (s) => setPrefs((p) => ({ ...p, sidebar: s })),
      toggleSidebar: () =>
        setPrefs((p) => ({
          ...p,
          sidebar: p.sidebar === "expanded" ? "rail" : "expanded",
        })),
      inspector: prefs.inspector,
      setInspector: (s) => setPrefs((p) => ({ ...p, inspector: s })),
      density: prefs.density,
      setDensity: (d) => setPrefs((p) => ({ ...p, density: d })),
      paletteOpen,
      setPaletteOpen,
    };
  }, [prefs, paletteOpen]);

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspace(): Ctx {
  const v = useContext(WorkspaceCtx);
  if (!v) throw new Error("useWorkspace debe usarse dentro de <WorkspaceProvider>.");
  return v;
}