/**
 * local-draft.ts — Respaldo local de lo que el editor está tecleando en el CMS.
 *
 * El sistema operativo puede descartar la pestaña cuando el editor cambia de
 * aplicación (por ejemplo, para copiar un dato); al volver, el formulario se
 * monta de nuevo vacío. Guardamos lo escrito sólo en este dispositivo (nunca en
 * el servidor, nunca como contenido publicado), junto con el punto de la
 * pantalla donde iba, y lo ofrecemos de vuelta al regresar. Se borra al
 * guardar la ficha o cuando el editor lo descarta.
 */

export const LOCAL_DRAFT_PREFIX = "vmx.cms.local-draft.v1";
export const LOCAL_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredDraft<T> {
  savedAt: number;
  values: T;
  scrollTop?: number;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): DraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function localDraftKey(table: string, id: string | null | undefined): string {
  return `${LOCAL_DRAFT_PREFIX}:${table}:${id ?? "nuevo"}`;
}

export function readStoredDraft<T>(
  key: string,
  sanitize: (raw: unknown) => T | null,
  options: { storage?: DraftStorage | null; now?: number } = {},
): StoredDraft<T> | null {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft<unknown>> | null;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if ((options.now ?? Date.now()) - parsed.savedAt > LOCAL_DRAFT_MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    const values = sanitize(parsed.values);
    if (values === null) return null;
    const draft: StoredDraft<T> = { savedAt: parsed.savedAt, values };
    if (typeof parsed.scrollTop === "number" && parsed.scrollTop > 0) {
      draft.scrollTop = parsed.scrollTop;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeStoredDraft<T>(
  key: string,
  values: T,
  options: { storage?: DraftStorage | null; now?: number; scrollTop?: number | null } = {},
): void {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  if (!storage) return;
  try {
    const draft: StoredDraft<T> = { savedAt: options.now ?? Date.now(), values };
    if (typeof options.scrollTop === "number" && options.scrollTop > 0) {
      draft.scrollTop = Math.round(options.scrollTop);
    }
    storage.setItem(key, JSON.stringify(draft));
  } catch {
    /* sin espacio o modo privado: no interrumpimos la edición */
  }
}

export function removeStoredDraft(key: string, storage: DraftStorage | null = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* almacenamiento no disponible: el formulario sigue funcionando */
  }
}

/** Sólo los textos conservan forma de formulario (`Record<string, string>`). */
export function sanitizeStringRecord(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") values[k] = v;
  }
  return Object.keys(values).length ? values : null;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = stable((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

/** Igualdad por contenido, sin importar el orden de las llaves. */
export function sameDraftValues(a: unknown, b: unknown): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

/** Área desplazable del Workspace (o la ventana, fuera de él). */
function scrollArea(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("main");
}

export function readEditorScroll(): number | null {
  const area = scrollArea();
  if (area && area.scrollHeight > area.clientHeight) return area.scrollTop;
  if (typeof window !== "undefined") return window.scrollY;
  return null;
}

/**
 * Regresa al punto donde iba el editor. El contenido puede tardar en
 * aparecer, así que se reintenta unas veces y se detiene en cuanto llega.
 */
export function restoreEditorScroll(top: number): void {
  if (typeof window === "undefined" || !(top > 0)) return;
  const attempts = [120, 450, 900, 1600];
  let done = false;
  for (const delay of attempts) {
    window.setTimeout(() => {
      if (done) return;
      const area = scrollArea();
      if (area && area.scrollHeight > area.clientHeight) {
        area.scrollTop = top;
        if (Math.abs(area.scrollTop - top) < 8) done = true;
      } else {
        window.scrollTo({ top });
        if (Math.abs(window.scrollY - top) < 8) done = true;
      }
    }, delay);
  }
}
