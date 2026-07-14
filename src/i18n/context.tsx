/**
 * i18n/context.tsx — Proveedor de internacionalización.
 *
 * H1 "Idiomas configurables": la lista de idiomas ahora proviene de
 * `platform_locales` vía `listActiveLocales()`. El diccionario JSON
 * sigue siendo local (traducciones estáticas de UI); los idiomas
 * activos, el default y el orden se administran desde BD.
 *
 * Fallback: si la consulta falla o aún no ha cargado, se usa
 * `ACTIVE_LOCALES` estático para no bloquear SSR ni el primer render.
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
import { ACTIVE_LOCALES, DEFAULT_LOCALE, type LocaleCode } from "@/config/languages";
import { listActiveLocales, type PlatformLocaleDTO } from "@/lib/i18n/locales.functions";
// H2·P3 — Sólo el diccionario del locale por defecto viaja en el entry
// principal. Los demás se cargan on-demand cuando `setLocale` lo pide
// o cuando la hidratación detecta una preferencia distinta. Si el
// diccionario aún no está listo, `t()` cae al default (mismo
// comportamiento actual para claves faltantes) — nunca queda en
// blanco ni bloquea el primer paint.
import es from "./locales/es.json";
import type { UiAutoTranslatorHandle } from "@/lib/i18n/ui-auto-translate";

type Dict = Record<string, unknown>;

const DICTS: Partial<Record<LocaleCode, Dict>> = { es };

// Cargadores diferidos — devuelven la misma promesa si ya se pidió.
const LOADERS: Record<Exclude<LocaleCode, "es">, () => Promise<Dict>> = {
  en: () => import("./locales/en.json").then((m) => (m.default ?? m) as Dict),
  fr: () => import("./locales/fr.json").then((m) => (m.default ?? m) as Dict),
  de: () => import("./locales/de.json").then((m) => (m.default ?? m) as Dict),
  it: () => import("./locales/it.json").then((m) => (m.default ?? m) as Dict),
  pt: () => import("./locales/pt.json").then((m) => (m.default ?? m) as Dict),
};
const loadingLocales: Partial<Record<LocaleCode, Promise<Dict>>> = {};

function ensureLocaleLoaded(code: LocaleCode): Promise<Dict> | Dict | null {
  const cached = DICTS[code];
  if (cached) return cached;
  if (code === "es") return es;
  const loader = LOADERS[code as Exclude<LocaleCode, "es">];
  if (!loader) return null;
  if (!loadingLocales[code]) {
    loadingLocales[code] = loader().then((dict) => {
      DICTS[code] = dict;
      return dict;
    });
  }
  return loadingLocales[code]!;
}

const STORAGE_KEY = "vlx.locale";

function staticLocales(): PlatformLocaleDTO[] {
  return ACTIVE_LOCALES.map((l, i) => ({
    code: l.code,
    label: l.label,
    native_label: l.native_label,
    flag: l.flag,
    is_default: l.code === DEFAULT_LOCALE,
    is_active: true,
    sort_order: i,
  }));
}

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string) => string;
  locales: PlatformLocaleDTO[];
  defaultLocale: LocaleCode;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveKey(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [locales, setLocales] = useState<PlatformLocaleDTO[]>(() => staticLocales());
  const [defaultLocale, setDefaultLocale] = useState<LocaleCode>(DEFAULT_LOCALE);
  // H2·P3 — Bump que dispara re-render cuando un diccionario diferido
  // termina de cargarse, para que `t()` reemplace los textos por sus
  // traducciones sin requerir cambio de estado del consumidor.
  const [, setDictVersion] = useState(0);

  // Hidratación: lee localStorage sólo en cliente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && ACTIVE_LOCALES.some((l) => l.code === stored)) {
      setLocaleState(stored);
    }
  }, []);

  // Asegura que el diccionario del locale activo se cargue en cliente.
  useEffect(() => {
    const result = ensureLocaleLoaded(locale);
    if (result && typeof (result as Promise<Dict>).then === "function") {
      (result as Promise<Dict>).then(() => setDictVersion((v) => v + 1)).catch(() => undefined);
    }
  }, [locale]);

  // Precarga el diccionario del default si es distinto del activo — se
  // usa como fallback en `t()`. Se hace en idle para no competir con
  // el paint inicial.
  useEffect(() => {
    if (defaultLocale === locale) return;
    const result = ensureLocaleLoaded(defaultLocale);
    if (result && typeof (result as Promise<Dict>).then === "function") {
      (result as Promise<Dict>).then(() => setDictVersion((v) => v + 1)).catch(() => undefined);
    }
  }, [defaultLocale, locale]);

  // Carga la lista real de idiomas desde BD (respeta administración).
  useEffect(() => {
    let cancelled = false;
    listActiveLocales()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        setLocales(rows);
        const def = rows.find((r) => r.is_default)?.code as LocaleCode | undefined;
        if (def) setDefaultLocale(def);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: LocaleCode) => {
    // Dispara la carga on-demand ANTES de actualizar el estado — así
    // el próximo render ya encuentra el diccionario listo (o al menos
    // en camino).
    const result = ensureLocaleLoaded(l);
    if (result && typeof (result as Promise<Dict>).then === "function") {
      (result as Promise<Dict>).then(() => setDictVersion((v) => v + 1)).catch(() => undefined);
    }
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  // Mantén <html lang> en sync.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Runtime auto-translator: cubre cualquier texto que no pase por t().
  useEffect(() => {
    if (typeof window === "undefined") return;
    let handle: UiAutoTranslatorHandle | null = null;
    let cancelled = false;
    void import("@/lib/i18n/ui-auto-translate").then(({ startUiAutoTranslator }) => {
      if (cancelled) return;
      handle = startUiAutoTranslator(locale);
      // Expose for setLocale below.
      (window as unknown as { __vlxUiTr?: UiAutoTranslatorHandle }).__vlxUiTr = handle;
    });
    return () => {
      cancelled = true;
      handle?.stop();
      delete (window as unknown as { __vlxUiTr?: UiAutoTranslatorHandle }).__vlxUiTr;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia el idioma, notifica al observador para re-traducir todo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __vlxUiTr?: UiAutoTranslatorHandle };
    w.__vlxUiTr?.setLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: string): string => {
      const activeDict = DICTS[locale];
      const primary = activeDict ? resolveKey(activeDict, key) : undefined;
      if (primary !== undefined) return primary;
      const fbDict = DICTS[defaultLocale] ?? DICTS[DEFAULT_LOCALE];
      const fallback = fbDict ? resolveKey(fbDict, key) : undefined;
      return fallback ?? key;
    },
    [locale, defaultLocale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales, defaultLocale }),
    [locale, setLocale, t, locales, defaultLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback seguro fuera de provider (no debería ocurrir).
    const defDict = DICTS[DEFAULT_LOCALE];
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (k) => (defDict ? resolveKey(defDict, k) ?? k : k),
      locales: staticLocales(),
      defaultLocale: DEFAULT_LOCALE,
    };
  }
  return ctx;
}
