import { useMemo, useRef } from "react";
import { Compass, Sparkles } from "lucide-react";

import { TourismChip, TourismChipRow } from "@/components/omxds/TourismChip";
import { useRegisterAluxEmbedded } from "@/lib/alux/embedded-presence";

import { useBrand } from "@/lib/brand/brand-context";
import { openAluxFloating, type AluxOpenSelection } from "@/lib/alux/floating-bus";
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
  /** Lote 3J.1 · Selección estructurada que el dock consume tal cual. */
  selection?: AluxOpenSelection;
}

// Utility export is intentionally colocated with its canonical panel contract.
// eslint-disable-next-line react-refresh/only-export-components
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
  selection,
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
      ...(selection ? { selection } : {}),
    });

  return (
    <section
      ref={ref}
      data-alux-embedded="panel"
      className={cn(
        /* Lote 3G.1 · presencia secundaria: superficie clara con acento de
           marca en lugar de una masa de color, altura y padding reducidos. */
        "rounded-2xl border border-selva/25 border-l-2 border-l-selva/70 bg-selva/[0.06]",
        compact ? "px-3 py-2.5" : "px-3.5 py-3",
        className,
      )}
      aria-label={`${brand.conciergeName}, concierge IA`}
    >
      <div
        className={cn(
          "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2",
          variant === "bar" && "lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-4",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 lg:pr-3">
          <AluxMark
            family="avatar"
            size={28}
            className="size-7 shrink-0 lg:size-8"
            decorative
            loading="eager"
          />
          <div className="min-w-0">
            <h2 className="truncate font-display text-sm leading-tight text-selva">
              {brand.conciergeName}
            </h2>
            <p className="text-[10.5px] leading-tight text-muted-foreground">Concierge IA</p>
          </div>
        </div>

        {/* `min-w-0`: la fila de sugerencias hace scroll horizontal interno y
            no debe ensanchar la rejilla ni la página en móvil. */}
        <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <p className="line-clamp-1 max-w-2xl text-[13px] font-medium leading-snug text-foreground">
            {title}
          </p>
          <p className="sr-only">{description}</p>
          <TourismChipRow
            label={`Pistas para ${brand.conciergeName}`}
            behavior="rail"
            className="mt-1.5 lg:mt-1"
          >
            {chips.map((prompt) => (
              <TourismChip key={prompt} scheme="surface" size="xs" onClick={() => ask(prompt)}>
                {prompt}
              </TourismChip>
            ))}
          </TourismChipRow>
        </div>

        <button
          type="button"
          onClick={() => ask()}
          className="relative col-start-2 row-start-1 inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 justify-self-end rounded-pill lg:col-start-3 lg:justify-self-start border border-selva/40 bg-background px-3.5 text-[13px] font-semibold text-selva transition-colors hover:bg-selva/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
        >
          {variant === "card" ? (
            <Sparkles className="size-3.5" aria-hidden />
          ) : (
            <Compass className="size-3.5" aria-hidden />
          )}
          Planear con {brand.conciergeName}
        </button>
      </div>
    </section>
  );
}
