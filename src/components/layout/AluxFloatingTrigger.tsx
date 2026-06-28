/**
 * AluxFloatingTrigger — Presencia visual de Alux en toda la plataforma.
 *
 * Propósito: cumplir Blueprint §6 (Alux transversal) desde Fase 0,
 * SIN activar IA. Botón flotante deshabilitado con tooltip "Alux llega pronto".
 * En Fase 5 se conecta al motor real.
 */
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/context";

export function AluxFloatingTrigger() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
      <button
        type="button"
        disabled
        aria-disabled
        title={t("alux_floating")}
        className="pointer-events-auto group flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-3 text-sm font-medium text-foreground shadow-lg backdrop-blur transition hover:bg-card disabled:cursor-not-allowed"
      >
        <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <span className="hidden sm:inline">Alux</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          · {t("alux_floating")}
        </span>
      </button>
    </div>
  );
}
