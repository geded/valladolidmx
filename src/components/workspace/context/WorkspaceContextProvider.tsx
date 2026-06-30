/**
 * WorkspaceContextProvider (15.10.5b)
 *
 * Estado contextual transversal del Workspace Engine:
 *  - selection (single/multi/range)
 *  - focusedEntity (zero context loss)
 *  - viewId activo
 *  - filters/scroll (snapshot serializable opaco)
 *
 * Persiste un ContextSnapshot por workspace en sessionStorage
 * (clave `vmx.workspace.ctx.<id>`). SSR-safe: window sólo en useEffect.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWorkspace } from "../WorkspaceProvider";
import type {
  ContextSnapshot,
  EntityRef,
  QuickActionDescriptor,
  SelectionMode,
} from "@/lib/workspace/types";
import {
  getWorkspaceContextDefinition,
  listQuickActionsFor,
} from "@/lib/workspace/context-registry";

const STORAGE_PREFIX = "vmx.workspace.ctx.";

interface ContextState {
  viewId: string | null;
  selection: EntityRef[];
  selectionMode: SelectionMode;
  focused: EntityRef | null;
  filters: Record<string, unknown>;
  scroll: number;
}

const DEFAULT_STATE: ContextState = {
  viewId: null,
  selection: [],
  selectionMode: "single",
  focused: null,
  filters: {},
  scroll: 0,
};

interface Ctx {
  workspaceId: string;
  viewId: string | null;
  setViewId: (id: string | null) => void;

  // Selection
  selection: ReadonlyArray<EntityRef>;
  selectionMode: SelectionMode;
  setSelectionMode: (m: SelectionMode) => void;
  selectOne: (ref: EntityRef) => void;
  toggleSelect: (ref: EntityRef) => void;
  selectRange: (refs: EntityRef[]) => void;
  clearSelection: () => void;
  isSelected: (ref: EntityRef) => boolean;

  // Focus (último entity con foco — preserva contexto)
  focused: EntityRef | null;
  setFocused: (ref: EntityRef | null) => void;

  // Filters / scroll (opacos, para State Preservation Policy)
  filters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  scroll: number;
  setScroll: (n: number) => void;

  // Acciones derivadas del Context Registry
  availableActions: QuickActionDescriptor[];

  // Snapshot serializable (para Alux / debug / deep links)
  snapshot: () => ContextSnapshot;
  restore: (snap: ContextSnapshot) => void;
}

const WorkspaceContextCtx = createContext<Ctx | null>(null);

function loadSnapshot(workspaceId: string): ContextState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + workspaceId);
    if (!raw) return DEFAULT_STATE;
    const snap = JSON.parse(raw) as ContextSnapshot;
    return {
      viewId: snap.viewId,
      selection: snap.selection ?? [],
      selectionMode: snap.selectionMode ?? "single",
      focused: snap.focused,
      filters: snap.filters ?? {},
      scroll: snap.scroll ?? 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function refKey(r: EntityRef) {
  return `${r.type}:${r.id}`;
}

export function WorkspaceContextProvider({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "_";

  const [state, setState] = useState<ContextState>(DEFAULT_STATE);
  const hydratedFor = useRef<string | null>(null);

  // Cargar snapshot cuando cambia el workspace activo.
  useEffect(() => {
    if (!workspaceId || workspaceId === "_") return;
    setState(loadSnapshot(workspaceId));
    hydratedFor.current = workspaceId;
  }, [workspaceId]);

  // Persistir snapshot.
  useEffect(() => {
    if (hydratedFor.current !== workspaceId) return;
    if (typeof window === "undefined") return;
    const snap: ContextSnapshot = {
      workspaceId,
      route: window.location.pathname,
      viewId: state.viewId,
      selection: state.selection,
      selectionMode: state.selectionMode,
      focused: state.focused,
      filters: state.filters,
      scroll: state.scroll,
      ts: Date.now(),
    };
    try {
      window.sessionStorage.setItem(
        STORAGE_PREFIX + workspaceId,
        JSON.stringify(snap),
      );
    } catch {
      /* noop */
    }
  }, [workspaceId, state]);

  const value = useMemo<Ctx>(() => {
    const isSelected = (ref: EntityRef) =>
      state.selection.some((r) => refKey(r) === refKey(ref));

    const setSelection = (next: EntityRef[]) =>
      setState((s) => ({ ...s, selection: next, focused: next[next.length - 1] ?? s.focused }));

    return {
      workspaceId,
      viewId: state.viewId,
      setViewId: (id) => setState((s) => ({ ...s, viewId: id })),

      selection: state.selection,
      selectionMode: state.selectionMode,
      setSelectionMode: (m) => setState((s) => ({ ...s, selectionMode: m })),
      selectOne: (ref) => setSelection([ref]),
      toggleSelect: (ref) => {
        if (state.selectionMode === "single") {
          setSelection(isSelected(ref) ? [] : [ref]);
          return;
        }
        setSelection(
          isSelected(ref)
            ? state.selection.filter((r) => refKey(r) !== refKey(ref))
            : [...state.selection, ref],
        );
      },
      selectRange: (refs) => setSelection(refs),
      clearSelection: () => setState((s) => ({ ...s, selection: [] })),
      isSelected,

      focused: state.focused,
      setFocused: (ref) => setState((s) => ({ ...s, focused: ref })),

      filters: state.filters,
      setFilter: (k, v) =>
        setState((s) => ({ ...s, filters: { ...s.filters, [k]: v } })),
      clearFilters: () => setState((s) => ({ ...s, filters: {} })),
      scroll: state.scroll,
      setScroll: (n) => setState((s) => ({ ...s, scroll: n })),

      availableActions: workspace
        ? listQuickActionsFor(workspace.id).filter((a) => {
            if (a.scope === "entity" && !state.focused) return false;
            if (a.scope === "selection" && state.selection.length === 0) return false;
            const ctxRun = {
              workspaceId,
              selection: state.selection,
              focused: state.focused,
            };
            return a.when ? a.when(ctxRun) : true;
          })
        : [],

      snapshot: () => ({
        workspaceId,
        route: typeof window !== "undefined" ? window.location.pathname : "",
        viewId: state.viewId,
        selection: state.selection,
        selectionMode: state.selectionMode,
        focused: state.focused,
        filters: state.filters,
        scroll: state.scroll,
        ts: Date.now(),
      }),
      restore: (snap) =>
        setState({
          viewId: snap.viewId,
          selection: snap.selection,
          selectionMode: snap.selectionMode,
          focused: snap.focused,
          filters: snap.filters ?? {},
          scroll: snap.scroll ?? 0,
        }),
    };
  }, [workspace, workspaceId, state]);

  // Información sólo lectura útil para introspección.
  useMemo(
    () => getWorkspaceContextDefinition(workspaceId),
    [workspaceId],
  );

  return (
    <WorkspaceContextCtx.Provider value={value}>
      {children}
    </WorkspaceContextCtx.Provider>
  );
}

export function useWorkspaceContext(): Ctx {
  const v = useContext(WorkspaceContextCtx);
  if (!v)
    throw new Error(
      "useWorkspaceContext debe usarse dentro de <WorkspaceContextProvider>.",
    );
  return v;
}

export function useSelection() {
  const c = useWorkspaceContext();
  return {
    selection: c.selection,
    mode: c.selectionMode,
    setMode: c.setSelectionMode,
    selectOne: c.selectOne,
    toggle: c.toggleSelect,
    selectRange: c.selectRange,
    clear: c.clearSelection,
    isSelected: c.isSelected,
  };
}

export function useFocusedEntity() {
  const c = useWorkspaceContext();
  return { focused: c.focused, setFocused: c.setFocused };
}

export function useAvailableActions() {
  return useWorkspaceContext().availableActions;
}

/** Helper para enganchar restauración de scroll opcional. */
export function useScrollPreservation(ref: { current: HTMLElement | null }) {
  const { scroll, setScroll } = useWorkspaceContext();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = scroll;
    const onScroll = () => setScroll(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

// silencia lint si no se usa setFocused vía hook adicional.
void useCallback;