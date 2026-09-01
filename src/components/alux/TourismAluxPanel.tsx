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
}: TourismAluxPanelProps) {
  const ask = (preference?: string) =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(task, preference),
    });

  return (
    <section
      className={cn("rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5", className)}
      aria-label={`${ACTIVE_BRAND.conciergeName}, concierge IA`}
    >
      <div
        className={cn(
          "grid gap-4",
          variant === "bar" && "lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <AluxMark family="avatar" size={52} decorative loading="eager" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {ACTIVE_BRAND.conciergeName} · Concierge IA
            </p>
            <h2 className="mt-1 font-serif text-2xl leading-tight text-foreground">{title}</h2>
          </div>
        </div>

        <div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          {prompts.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="min-h-11 shrink-0 rounded-full border border-border bg-background px-4 text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => ask()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-selva px-5 text-sm font-semibold text-selva-foreground transition-opacity hover:opacity-90"
        >
          {variant === "card" ? <Sparkles className="size-4" /> : <Compass className="size-4" />}
          Planear con {ACTIVE_BRAND.conciergeName}
        </button>
      </div>
    </section>
  );
}
