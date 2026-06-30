/**
 * SheetStackProvider (15.10.5b) — Universal Interaction Layer.
 * Push/pop programático de bottom sheets, reutiliza BottomSheet existente.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BottomSheet, type SheetSnap } from "../BottomSheet";

interface SheetEntry {
  id: string;
  title?: string;
  description?: string;
  snap: SheetSnap;
  content: ReactNode;
}

interface Ctx {
  stack: SheetEntry[];
  push: (entry: Omit<SheetEntry, "id"> & { id?: string }) => string;
  pop: () => void;
  close: (id: string) => void;
  clear: () => void;
}

const SheetStackCtx = createContext<Ctx | null>(null);

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetEntry[]>([]);

  const push = useCallback<Ctx["push"]>((entry) => {
    const id =
      entry.id ?? `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setStack((s) => [...s, { snap: entry.snap ?? "half", ...entry, id }]);
    return id;
  }, []);

  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const close = useCallback(
    (id: string) => setStack((s) => s.filter((e) => e.id !== id)),
    [],
  );
  const clear = useCallback(() => setStack([]), []);

  const value = useMemo<Ctx>(
    () => ({ stack, push, pop, close, clear }),
    [stack, push, pop, close, clear],
  );

  const top = stack[stack.length - 1];

  return (
    <SheetStackCtx.Provider value={value}>
      {children}
      {top ? (
        <BottomSheet
          open
          onOpenChange={(o) => !o && close(top.id)}
          title={top.title}
          description={top.description}
          snap={top.snap}
        >
          {top.content}
        </BottomSheet>
      ) : null}
    </SheetStackCtx.Provider>
  );
}

export function useSheetStack(): Ctx {
  const v = useContext(SheetStackCtx);
  if (!v) throw new Error("useSheetStack debe usarse dentro de <SheetStackProvider>.");
  return v;
}