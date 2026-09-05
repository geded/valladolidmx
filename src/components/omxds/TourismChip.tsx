/**
 * OMXDS · TourismChip / TourismChipRow (Lote 3G)
 *
 * Autoridad única de los "chips" o píldoras de selección turística
 * (composición del viaje, pistas de Alux, filtros rápidos). Ninguna
 * plantilla vuelve a definir su propia píldora.
 *
 * Reglas gobernadas:
 *  - compacto y simétrico: misma altura, mismo radio, mismo ritmo;
 *  - objetivo táctil real ≥ 44×44 px (alto mínimo 44 px, `size="sm"` 40 px
 *    sólo en superficies densas de escritorio);
 *  - estados coherentes: normal · hover · seleccionado · foco · disabled;
 *  - nunca recorta la etiqueta: `whitespace-nowrap` + fila con wrap
 *    (escritorio/tablet) o scroll horizontal accesible (móvil);
 *  - dos esquemas de color: `surface` (sobre tarjeta) y `onDark`
 *    (sobre el verde selva del módulo de Alux).
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TourismChipScheme = "surface" | "onDark";
export type TourismChipSize = "xs" | "sm" | "md";

export interface TourismChipProps {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  scheme?: TourismChipScheme;
  size?: TourismChipSize;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

const BASE =
  "relative inline-flex shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-pill border font-medium leading-none transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Lote 3G.1 · el tamaño VISUAL de la píldora baja, pero el ÁREA TÁCTIL real
 * se conserva ≥ 44 px extendiendo el objetivo con un pseudo-elemento
 * (`after`) que no altera el ritmo vertical ni la altura del módulo.
 */
const TOUCH_EXTENSION =
  "after:pointer-events-auto after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']";

const SIZES: Record<TourismChipSize, string> = {
  // 32 px visuales · 44 px táctiles reales (módulos de Alux, densidad alta).
  xs: `min-h-8 px-3 text-[12.5px] ${TOUCH_EXTENSION}`,
  // 36 px visuales · 44 px táctiles reales.
  sm: `min-h-9 px-3.5 text-[13px] ${TOUCH_EXTENSION}`,
  // 44 px reales, sin extensión.
  md: "min-h-11 px-3.5 text-[13px]",
};


const SCHEMES: Record<TourismChipScheme, { idle: string; selected: string }> = {
  surface: {
    idle: "border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring focus-visible:ring-offset-background",
    selected:
      "border-primary bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-background",
  },
  onDark: {
    idle: "border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-selva",
    selected:
      "border-white bg-white text-selva hover:bg-white/90 focus-visible:ring-white focus-visible:ring-offset-selva",
  },
};

export function TourismChip({
  children,
  selected = false,
  disabled = false,
  scheme = "surface",
  size = "md",
  onClick,
  ariaLabel,
  className,
}: TourismChipProps) {
  const tone = SCHEMES[scheme];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={onClick ? selected : undefined}
      aria-label={ariaLabel}
      data-omxds-chip={scheme}
      data-selected={selected ? "true" : "false"}
      className={cn(BASE, SIZES[size], selected ? tone.selected : tone.idle, className)}
    >
      {children}
    </button>
  );
}

export interface TourismChipRowProps {
  children: ReactNode;
  /** Etiqueta accesible del grupo de chips. */
  label: string;
  /**
   * `wrap`  → envuelve siempre (recomendado: nunca recorta).
   * `rail`  → scroll horizontal en móvil y wrap desde `sm`.
   */
  behavior?: "wrap" | "rail";
  className?: string;
}

export function TourismChipRow({
  children,
  label,
  behavior = "wrap",
  className,
}: TourismChipRowProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-omxds-chip-row={behavior}
      className={cn(
        "flex min-w-0 gap-2",
        behavior === "wrap"
          ? "flex-wrap"
          : "-mx-1 snap-x snap-mandatory overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
