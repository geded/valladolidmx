/**
 * useLocalFormDraft — Conecta un formulario del CMS con su respaldo local
 * (`local-draft.ts`) y con la señal de trabajo sin guardar de la PWA.
 *
 * - `take(baseline?)` lee una sola vez lo que quedó escrito en este equipo
 *   (devuelve `null` si no hay nada o si coincide con lo ya guardado) y
 *   activa el guardado continuo. Llamarlo al llenar el formulario.
 * - Guarda 0.5 s después de cada cambio y en el instante en que la app pasa a
 *   segundo plano, se cierra la pestaña o el formulario se desmonta.
 * - `clear()` borra el respaldo (al guardar la ficha o al descartarlo).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readEditorScroll,
  readStoredDraft,
  removeStoredDraft,
  restoreEditorScroll,
  sameDraftValues,
  writeStoredDraft,
} from "@/lib/cms/local-draft";
import { FLUSH_DRAFTS_EVENT, setUnsavedWork } from "@/pwa/unsaved-work";

interface Options<T> {
  /** Llave de almacenamiento; `null` desactiva el respaldo. */
  key: string | null;
  /** Valores actuales del formulario (memorizados por quien llama). */
  value: T;
  /** ¿Hay algo escrito que todavía no llegó al servidor? */
  isDirty: (value: T) => boolean;
  sanitize: (raw: unknown) => T | null;
}

export function useLocalFormDraft<T>({ key, value, isDirty, sanitize }: Options<T>) {
  const [recoveredAt, setRecoveredAt] = useState<number | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;
  const valueRef = useRef(value);
  valueRef.current = value;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;
  /** El guardado continuo empieza sólo después de leer el respaldo previo. */
  const armedRef = useRef(false);
  /**
   * Respaldo recién recuperado que todavía no llega a la pantalla. Mientras
   * tanto no se escribe nada: los valores visibles aún son los anteriores
   * (vacíos) y pisarían lo recuperado.
   */
  const restorePendingRef = useRef(false);

  const flush = useCallback(() => {
    const k = keyRef.current;
    if (!k || !armedRef.current || restorePendingRef.current) return;
    if (isDirtyRef.current(valueRef.current)) {
      writeStoredDraft(k, valueRef.current, { scrollTop: readEditorScroll() });
      setUnsavedWork(k, true);
    } else {
      removeStoredDraft(k);
      setUnsavedWork(k, false);
    }
  }, []);

  const take = useCallback((baseline?: T): T | null => {
    const k = keyRef.current;
    if (!k) return null;
    armedRef.current = true;
    const draft = readStoredDraft(k, sanitizeRef.current);
    if (!draft) return null;
    if (baseline !== undefined && sameDraftValues(draft.values, baseline)) {
      removeStoredDraft(k);
      setUnsavedWork(k, false);
      setRecoveredAt(null);
      return null;
    }
    restorePendingRef.current = true;
    setRecoveredAt(draft.savedAt);
    setUnsavedWork(k, true);
    if (draft.scrollTop) restoreEditorScroll(draft.scrollTop);
    return draft.values;
  }, []);

  const clear = useCallback(() => {
    const k = keyRef.current;
    setRecoveredAt(null);
    if (!k) return;
    removeStoredDraft(k);
    setUnsavedWork(k, false);
  }, []);

  /* Guardado continuo mientras se escribe. */
  useEffect(() => {
    if (!armedRef.current) return;
    // Los valores cambiaron después de recuperar: lo recuperado ya está en pantalla.
    restorePendingRef.current = false;
    const timer = setTimeout(flush, 500);
    return () => clearTimeout(timer);
  }, [value, flush]);

  /* Y en el momento exacto en que la app pasa a segundo plano (que es cuando
     el sistema la descarta), al cerrar y cuando la app va a actualizarse. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("blur", flush);
    window.addEventListener(FLUSH_DRAFTS_EVENT, flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("blur", flush);
      window.removeEventListener(FLUSH_DRAFTS_EVENT, flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  /* Al salir del formulario (o cambiar de ficha) lo escrito queda respaldado;
     ya no hay pantalla abierta que una recarga pudiera vaciar. */
  useEffect(() => {
    return () => {
      // Sólo en un desmontaje real: si cambió la ficha, los valores ya son
      // de la otra y no deben guardarse bajo esta llave.
      if (keyRef.current === key) flush();
      if (key) setUnsavedWork(key, false);
      armedRef.current = false;
    };
  }, [key, flush]);

  return { recoveredAt, take, clear };
}
