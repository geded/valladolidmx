/**
 * CV6.7 · OnTripConciergePriorityBanner — Stateless UI.
 *
 * Rules (vinculantes · ver blueprint 16.CV6.7 · policy
 * `mem://policies/travel-assistance-layer.md`):
 *  - 100% presentacional: props → render.
 *  - No consulta APIs, no abre stores, no polling, no timers, no
 *    mutaciones, no reglas de negocio.
 *  - Auto-Hide si `state.visible === false`.
 *  - Explicable por defecto: renderiza rationale + SLA + estado del
 *    Concierge + outcome del CTA.
 */

import { ArrowRight, LifeBuoy } from "lucide-react";
import type { OnTripConciergeState } from "@/lib/traveler/on-trip-concierge";

export interface OnTripConciergePriorityBannerProps {
  state: OnTripConciergeState;
  /** Handler inyectado por el consumidor (mutaciones viven fuera). */
  onPrimary?: () => void;
  className?: string;
}

export function OnTripConciergePriorityBanner({
  state,
  onPrimary,
  className,
}: OnTripConciergePriorityBannerProps) {
  if (!state.visible) return null;

  const toneClass =
    state.state === "case_open"
      ? "border-primary/30 bg-primary/[0.04]"
      : state.state === "sla_breach"
        ? "border-destructive/30 bg-destructive/5"
        : "border-border/70 bg-card/60";

  return (
    <section
      aria-label={state.headline}
      className={`flex flex-col gap-3 rounded-3xl border p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5 ${toneClass} ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <LifeBuoy className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Asistencia en tu viaje
          </p>
          <h3 className="text-sm font-semibold text-foreground">
            {state.headline}
          </h3>
          <p className="text-xs text-muted-foreground">{state.rationale}</p>
          <p className="text-[11px] text-muted-foreground/90">
            <span className="font-medium text-foreground/80">{state.slaLabel}</span>
            {" · "}
            {state.conciergeStatus}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
            Al pulsar: {state.ctaOutcome}
          </p>
        </div>
      </div>

      {state.ctaIntent !== "none" && onPrimary ? (
        <button
          type="button"
          onClick={onPrimary}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] sm:self-auto"
        >
          {state.ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </section>
  );
}