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
import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";

type Dict = Record<string, unknown>;

const DICTS: Record<LocaleCode, Dict> = { es, en, fr, de, it, pt };
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

  // Hidratación: lee localStorage sólo en cliente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && ACTIVE_LOCALES.some((l) => l.code === stored)) {
      setLocaleState(stored);
    }
  }, []);

  // Carga la lista real de idiomas desde BD (respeta administración).
  useEffect(() => {
    let cancelled = false;
    listActiveLocales()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        setLocales(rows);
        const def = rows.find((r) => r.is_default)?.code as LocaleCode | undefined;
        if (def && DICTS[def]) setDefaultLocale(def);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: LocaleCode) => {
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

  const t = useCallback(
    (key: string): string => {
      const primary = DICTS[locale] ? resolveKey(DICTS[locale], key) : undefined;
      if (primary !== undefined) return primary;
      const fallback = resolveKey(DICTS[defaultLocale] ?? DICTS[DEFAULT_LOCALE], key);
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
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (k) => resolveKey(DICTS[DEFAULT_LOCALE], k) ?? k,
      locales: staticLocales(),
      defaultLocale: DEFAULT_LOCALE,
    };
  }
  return ctx;
}
