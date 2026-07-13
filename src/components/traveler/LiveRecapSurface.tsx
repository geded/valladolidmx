/**
 * CV6.8 · LiveRecapSurface — Stateless UI.
 *
 * Reglas vinculantes (`mem://policies/founder-recap-continuity.md`):
 *  - 100% presentacional: props → render.
 *  - Sin stores, polling, timers, efectos ni llamadas a APIs.
 *  - Auto-Hide si `recap.visible === false`.
 *  - Cada highlight/pendiente/preview declara `sources` (Explainable Summary).
 *  - No introduce memoria, cache ni nueva línea de tiempo.
 */

import { ArrowRight, CheckCircle2, Circle, Sunrise } from "lucide-react";
import type { LiveRecap } from "@/lib/traveler/live-recap";

export interface LiveRecapSurfaceProps {
  recap: LiveRecap;
  onOpenTomorrow?: () => void;
  className?: string;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function LiveRecapSurface({
  recap,
  onOpenTomorrow,
  className,
}: LiveRecapSurfaceProps) {
  if (!recap.visible) return null;

  return (
    <section
      aria-label={recap.headline}
      className={`flex flex-col gap-4 rounded-3xl border border-primary/25 bg-primary/[0.04] p-4 shadow-soft sm:p-5 ${className ?? ""}`}
    >
      <header className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <Sunrise className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Cierre del día
          </p>
          <h3 className="text-sm font-semibold text-foreground">{recap.headline}</h3>
          <p className="text-xs text-muted-foreground">{recap.rationale}</p>
        </div>
      </header>

      {recap.highlights.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lo vivido hoy
          </p>
          <ul className="space-y-1.5">
            {recap.highlights.map((h) => (
              <li key={h.id} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{h.label}</p>
                  <p className="text-muted-foreground">{h.rationale}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recap.pendingItems.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quedó pendiente
          </p>
          <ul className="space-y-1.5">
            {recap.pendingItems.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-xs">
                <Circle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{p.label}</p>
                  <p className="text-muted-foreground">{p.rationale}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recap.tomorrowPreview ? (
        <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Mañana · Día {recap.tomorrowPreview.day}
          </p>
          <p className="mt-1 text-xs text-foreground">
            {recap.tomorrowPreview.itemsCount} actividad
            {recap.tomorrowPreview.itemsCount === 1 ? "" : "es"} planeada
            {recap.tomorrowPreview.itemsCount === 1 ? "" : "s"}
            {recap.tomorrowPreview.firstStartAt
              ? ` · desde ${fmtTime(recap.tomorrowPreview.firstStartAt)}`
              : ""}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {recap.tomorrowPreview.rationale}
          </p>
          {onOpenTomorrow ? (
            <button
              type="button"
              onClick={onOpenTomorrow}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
            >
              Ver mañana
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
        Fuentes: {recap.sources.join(" · ")}
      </p>
    </section>
  );
}