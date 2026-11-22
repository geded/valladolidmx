/**
 * list-memory — Recuerda búsqueda, filtros y página de cada listado del CMS
 * mientras la pestaña siga abierta (sessionStorage), para que al volver del
 * editor el listado esté como lo dejaste. Hidratación segura: el primer
 * render usa los valores por omisión y adopta lo guardado en un efecto.
 */
import { useCallback, useEffect, useState } from "react";

const PREFIX = "vmx.cms.list.";

function read(key: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function write(key: string, value: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: el listado sigue funcionando en memoria */
  }
}

export interface CmsListMemory {
  ready: boolean;
  values: Record<string, unknown>;
  set: (field: string, value: unknown) => void;
}

export function useCmsListMemory(key: string): CmsListMemory {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValues(read(key));
    setReady(true);
  }, [key]);

  const set = useCallback(
    (field: string, value: unknown) => {
      setValues((current) => {
        const next = { ...current, [field]: value };
        write(key, next);
        return next;
      });
    },
    [key],
  );

  return { ready, values, set };
}

/** Un campo de texto recordado (filtros de selección del listado). */
export function useCmsListField(
  memory: CmsListMemory,
  field: string,
  fallback = "",
): [string, (next: string) => void] {
  const raw = memory.values[field];
  const value = typeof raw === "string" ? raw : fallback;
  const { set } = memory;
  const setValue = useCallback((next: string) => set(field, next), [set, field]);
  return [value, setValue];
}
