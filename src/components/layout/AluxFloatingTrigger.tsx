/**
 * AluxFloatingTrigger — Presencia visual de Alux en toda la plataforma.
 *
 * Propósito: presencia transversal de Alux sin dejar un control muerto.
 * Abre la superficie informativa /alux; las capacidades internas viven en Concierge.
 */
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/context";

export function AluxFloatingTrigger() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
      <Link
        to="/alux"
        title={t("alux_floating")}
        className="pointer-events-auto group flex items-center gap-2 rounded-md border border-border bg-card/90 px-3.5 py-2 text-[13px] font-medium text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-card active:scale-[0.98]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <span className="hidden sm:inline">Alux</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          · {t("alux_floating")}
        </span>
      </Link>
    </div>
  );
}
