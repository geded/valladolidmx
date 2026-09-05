/**
 * TravelPlanBand — Lote 3G.2
 *
 * Autoridad compartida de presentación para el módulo embebido de Mi Viaje
 * en superficies públicas ("Tu ruta empieza a tomar forma", resumen del
 * viaje y acciones Guardar/Agregar).
 *
 * Reglas de jerarquía (3G.2):
 *  · Ayuda contextual secundaria: superficie clara con acento discreto de
 *    marca, sin masa verde sólida ni sombra dominante.
 *  · Banda horizontal compacta en escritorio, equilibrio sin columnas altas
 *    en tablet y tarjeta breve en móvil.
 *  · Acciones compactas por contenido con área táctil real de 44 px.
 *  · Sólo presentación: no altera callbacks, IDs, persistencia, estados ni
 *    la conexión canónica con el Travel Plan.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TOUCH_EXTENSION =
  "after:pointer-events-auto after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']";

const ACTION_BASE =
  "relative inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 rounded-pill px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export function TravelPlanBand({
  eyebrow,
  title,
  summary,
  titleId,
  ariaLabelledBy,
  primary,
  secondary,
  className,
}: {
  eyebrow?: string;
  title: string;
  summary?: ReactNode;
  titleId?: string;
  ariaLabelledBy?: string;
  primary?: {
    label: string;
    onClick?: () => void;
    to?: string;
    done?: boolean;
    disabled?: boolean;
  };
  secondary?: { label: string; to?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <section
      aria-labelledby={ariaLabelledBy ?? titleId}
      data-travel-plan-band=""
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.05] text-foreground shadow-none",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 border-l-2 border-l-primary/70 px-3.5 py-2.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-4 lg:px-4">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary lg:size-8"
        >
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2
            id={titleId}
            className="truncate font-display text-sm leading-tight text-foreground"
          >
            {title}
          </h2>
          {eyebrow ? (
            <p className="truncate text-[10.5px] leading-tight text-muted-foreground">{eyebrow}</p>
          ) : null}
        </div>
        {summary ? (
          <p className="col-span-2 min-w-0 line-clamp-2 max-w-2xl text-[13px] leading-snug text-muted-foreground lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:line-clamp-1 lg:pl-3">
            {summary}
          </p>
        ) : null}
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:flex-nowrap lg:justify-end">
          {primary ? (
            primary.to ? (
              <Link
                to={primary.to}
                className={cn(
                  ACTION_BASE,
                  TOUCH_EXTENSION,
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {primary.done ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Compass className="size-3.5" aria-hidden />
                )}
                {primary.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={primary.onClick}
                disabled={primary.disabled}
                aria-pressed={primary.done}
                className={cn(
                  ACTION_BASE,
                  TOUCH_EXTENSION,
                  primary.done
                    ? "border border-primary/40 bg-background text-primary hover:bg-primary/10"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {primary.done ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Compass className="size-3.5" aria-hidden />
                )}
                {primary.label}
              </button>
            )
          ) : null}
          {secondary ? (
            secondary.to ? (
              <Link
                to={secondary.to}
                className={cn(
                  ACTION_BASE,
                  TOUCH_EXTENSION,
                  "border border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                {secondary.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondary.onClick}
                className={cn(
                  ACTION_BASE,
                  TOUCH_EXTENSION,
                  "border border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                {secondary.label}
              </button>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
