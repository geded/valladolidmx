import { Compass, Sparkles } from "lucide-react";

import { ACTIVE_BRAND } from "@/config/brand";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { cn } from "@/lib/utils";
import { AluxMark } from "./AluxMark";

export interface TourismAluxPanelProps {
  title: string;
  description: string;
  task: string;
  prompts?: readonly string[];
  className?: string;
  variant?: "bar" | "card";
  compact?: boolean;
}

export function buildAluxStageAwareHint(task: string, preference?: string): string {
  return [
    task,
    preference ? `Preferencia inicial: ${preference}.` : null,
    "Primero determina con Mi Viaje y mi perfil si estoy planeando venir o si ya estoy en el territorio.",
    "Si no puedes determinarlo, pregúntamelo.",
    "Solicita ubicación únicamente cuando ya estoy en la región, la cercanía aporta valor y te doy permiso.",
    "Explica cada recomendación y permite guardarla en Mi Viaje.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Presencia y comportamiento únicos del concierge en superficies turísticas. */
export function TourismAluxPanel({
  title,
  description,
  task,
  prompts = [],
  className,
  variant = "bar",
  compact = false,
}: TourismAluxPanelProps) {
  const ask = (preference?: string) =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(task, preference),
    });

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card shadow-soft",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5",
        className,
      )}
      aria-label={`${ACTIVE_BRAND.conciergeName}, concierge IA`}
    >
      <div
        className={cn(
          "grid gap-4",
          variant === "bar" && "lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <AluxMark family="avatar" size={44} className="shrink-0" decorative loading="eager" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {ACTIVE_BRAND.conciergeName} · Concierge IA
            </p>
            <h2
              className={cn(
                "mt-1 font-serif leading-tight text-foreground",
                compact ? "text-xl" : "text-2xl",
              )}
            >
              {title}
            </h2>
          </div>
        </div>

        {/* `min-w-0`: la fila de sugerencias hace scroll horizontal interno y
            no debe ensanchar la rejilla ni la página en móvil. */}
        <div className="min-w-0">
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
            {["Estoy planeando", "Ya estoy en la región", ...prompts].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => ask(prompt)}
                className={cn(
                  "inline-flex shrink-0 snap-start items-center whitespace-nowrap rounded-full border border-border bg-background px-4 text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/10",
                  compact ? "min-h-9" : "min-h-11",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => ask()}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-selva px-5 text-sm font-semibold text-selva-foreground transition-opacity hover:opacity-90 lg:w-auto"
        >
          {variant === "card" ? <Sparkles className="size-4" /> : <Compass className="size-4" />}
          Planear con {ACTIVE_BRAND.conciergeName}
        </button>
      </div>
    </section>
  );
}
