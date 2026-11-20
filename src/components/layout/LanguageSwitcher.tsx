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

export function LanguageSwitcher({
  className,
  align = "end",
  compact = false,
}: {
  className?: string;
  align?: "start" | "end";
  compact?: boolean;
}) {
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
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-border bg-card p-0 text-foreground transition-all hover:bg-accent active:scale-[0.98]",
          compact ? "size-7 min-h-7 min-w-7" : "size-11 min-h-11 min-w-11",
        )}
      >
        <Globe className="size-4" aria-hidden />
        <span className="sr-only">{locale.toUpperCase()}</span>
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
            className={cn(
              "absolute z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg",
              align === "start" ? "left-0" : "right-0",
              compact ? "top-24 mt-0" : null,
            )}
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
