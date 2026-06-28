/**
 * languages.ts — Idiomas oficiales de Valladolid.mx (Fase 0).
 * En Fase 7 se reemplaza por lectura de `system_settings` desde la BD.
 */

export type LocaleCode = "es" | "en" | "fr" | "de" | "it" | "pt";

export interface LocaleDefinition {
  code: LocaleCode;
  label: string;
  native_label: string;
  flag: string;
}

export const ACTIVE_LOCALES: readonly LocaleDefinition[] = [
  { code: "es", label: "Español", native_label: "Español", flag: "🇲🇽" },
  { code: "en", label: "English", native_label: "English", flag: "🇺🇸" },
  { code: "fr", label: "French", native_label: "Français", flag: "🇫🇷" },
  { code: "de", label: "German", native_label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italian", native_label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", native_label: "Português", flag: "🇵🇹" },
] as const;

export const DEFAULT_LOCALE: LocaleCode = "es";
