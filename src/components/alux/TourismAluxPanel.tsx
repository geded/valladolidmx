import { useMemo, useRef } from "react";
import { Compass, Sparkles } from "lucide-react";

import { TourismChip, TourismChipRow } from "@/components/omxds/TourismChip";
import { useRegisterAluxEmbedded } from "@/lib/alux/embedded-presence";

import { useBrand } from "@/lib/brand/brand-context";
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
  const brand = useBrand();
  const ref = useRef<HTMLElement | null>(null);
  useRegisterAluxEmbedded(ref);
  /* Lote 3G · sin pistas duplicadas: las sugerencias de la plantilla no
     pueden repetir las dos pistas base (clave React duplicada). */
  const chips = useMemo(
    () => Array.from(new Set<string>(["Estoy planeando", "Ya estoy en la región", ...prompts])),
    [prompts],
  );
  const ask = (preference?: string) =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(task, preference),
    });

  return (
    <section
      ref={ref}
      data-alux-embedded="panel"
      className={cn(
        "rounded-3xl border border-border bg-card shadow-soft",
        compact ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4.5",
        className,
      )}
      aria-label={`${brand.conciergeName}, concierge IA`}
    >
      <div
        className={cn(
          "grid gap-3.5",
          variant === "bar" && "lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <AluxMark family="avatar" size={40} className="shrink-0" decorative loading="eager" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {brand.conciergeName} · Concierge IA
            </p>
            <h2
              className={cn(
                "mt-1 font-serif leading-tight text-foreground",
                compact ? "text-lg" : "text-xl lg:text-2xl",
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
          <TourismChipRow
            label={`Pistas para ${brand.conciergeName}`}
            behavior="rail"
            className="mt-3"
          >
            {chips.map((prompt) => (
              <TourismChip
                key={prompt}
                scheme="surface"
                size={compact ? "sm" : "md"}
                onClick={() => ask(prompt)}
              >
                {prompt}
              </TourismChip>
            ))}
          </TourismChipRow>
        </div>

        <button
          type="button"
          onClick={() => ask()}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-pill bg-selva px-5 text-sm font-semibold text-selva-foreground transition-opacity hover:opacity-90 lg:w-auto"
        >
          {variant === "card" ? <Sparkles className="size-4" /> : <Compass className="size-4" />}
          Planear con {brand.conciergeName}
        </button>
      </div>
    </section>
  );
}
