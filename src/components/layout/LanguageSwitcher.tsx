/**
 * LanguageSwitcher — Selector visible de idioma (6 idiomas Fase 0).
 *
 * Propósito: cumplir requisito "selector de idioma siempre visible".
 * Lee la lista desde `src/config/languages.ts`; en Fase 7 vendrá de BD.
 *
 * Dependencias: useTranslation(), ACTIVE_LOCALES.
 */
import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";
import type { LocaleCode } from "@/config/languages";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, locales, t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.language")}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[13px] font-medium text-foreground hover:bg-accent transition-all active:scale-[0.98]"
      >
        <Globe className="size-4" aria-hidden />
        <span className="uppercase">{locale}</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label={t("common.language")}
            className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
          >
            {locales.map((l) => {
              const active = l.code === locale;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLocale(l.code as LocaleCode);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{l.flag}</span>
                      <span>{l.native_label}</span>
                    </span>
                    {active ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
