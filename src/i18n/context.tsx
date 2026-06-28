/**
 * i18n/context.tsx — Proveedor mínimo de internacionalización (Fase 0).
 *
 * Propósito: ofrecer un hook `useTranslation()` con `t("path.dot")`,
 * cambio de idioma persistente en localStorage y fallback a `es`.
 *
 * Responsabilidades:
 *  - Cargar diccionarios estáticos JSON (es/en/fr/de/it/pt).
 *  - Exponer locale activo, lista de locales y setter.
 *  - Persistir selección en `localStorage` (clave `vlx.locale`).
 *
 * Dependencias: `src/config/languages.ts`, JSON locales.
 * En Fase 7 se reemplazará la fuente de locales por `system_settings`.
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
import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";

type Dict = Record<string, unknown>;

const DICTS: Record<LocaleCode, Dict> = { es, en, fr, de, it, pt };
const STORAGE_KEY = "vlx.locale";

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string) => string;
  locales: typeof ACTIVE_LOCALES;
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

  // Hidratación: lee localStorage sólo en cliente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && ACTIVE_LOCALES.some((l) => l.code === stored)) {
      setLocaleState(stored);
    }
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
      const primary = resolveKey(DICTS[locale], key);
      if (primary !== undefined) return primary;
      const fallback = resolveKey(DICTS[DEFAULT_LOCALE], key);
      return fallback ?? key;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales: ACTIVE_LOCALES }),
    [locale, setLocale, t],
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
      locales: ACTIVE_LOCALES,
    };
  }
  return ctx;
}
