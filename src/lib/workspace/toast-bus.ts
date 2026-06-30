/**
 * Toast & Undo bus (15.10.5b) — capa única sobre sonner con stack de undo
 * accesible por Alux. Conforma "Interaction Consistency Policy".
 */
import { toast } from "sonner";

export interface UndoEntry {
  id: string;
  label: string;
  ts: number;
  undo: () => void | Promise<void>;
}

const STACK_LIMIT = 5;
const stack: UndoEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function pushUndo(entry: UndoEntry) {
  stack.unshift(entry);
  if (stack.length > STACK_LIMIT) stack.length = STACK_LIMIT;
  notify();
}

export function listUndoStack(): ReadonlyArray<UndoEntry> {
  return stack;
}

export function subscribeUndoStack(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export async function runUndo(id: string): Promise<void> {
  const idx = stack.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const [entry] = stack.splice(idx, 1);
  notify();
  await entry.undo();
  toast.success("Acción revertida");
}

interface ToastOpts {
  description?: string;
  undo?: { label?: string; run: () => void | Promise<void> };
}

function showWithUndo(
  kind: "success" | "error" | "info",
  message: string,
  opts?: ToastOpts,
) {
  const fn =
    kind === "success" ? toast.success : kind === "error" ? toast.error : toast;
  const id = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (opts?.undo) {
    pushUndo({
      id,
      label: message,
      ts: Date.now(),
      undo: opts.undo.run,
    });
  }
  fn(message, {
    description: opts?.description,
    action: opts?.undo
      ? {
          label: opts.undo.label ?? "Deshacer",
          onClick: () => void runUndo(id),
        }
      : undefined,
  });
}

export const workspaceToast = {
  success: (msg: string, opts?: ToastOpts) => showWithUndo("success", msg, opts),
  error: (msg: string, opts?: ToastOpts) => showWithUndo("error", msg, opts),
  info: (msg: string, opts?: ToastOpts) => showWithUndo("info", msg, opts),
  promise: toast.promise,
};