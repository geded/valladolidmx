/**
 * H-03 · Ola I1.c — `vmx.experience.features` (Capa 1: Presentación).
 */
import {
  Accessibility,
  Car,
  Check,
  Leaf,
  Utensils,
  Waves,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExperienceFeaturesDTO } from "@/lib/experience-builder/blocks/experience-features/contract";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  utensils: Utensils,
  car: Car,
  waves: Waves,
  leaf: Leaf,
  accessibility: Accessibility,
};

export interface ExperienceFeaturesProps {
  dto: ExperienceFeaturesDTO;
  className?: string;
}

export function ExperienceFeatures({ dto, className }: ExperienceFeaturesProps) {
  const { variant, heading, subheading, columns, items, ariaLabel, capabilities } = dto;
  if (items.length === 0) return null;

  const visible = capabilities.showUnavailable ? items : items.filter((i) => i.available);
  if (visible.length === 0) return null;

  const colCls =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <section aria-label={ariaLabel} data-eb-block="experience-features" className={cn("w-full", className)}>
      {(heading || subheading) && (
        <header className="mb-5 flex flex-col gap-1">
          {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
          {subheading ? <p className="text-sm text-muted-foreground">{subheading}</p> : null}
        </header>
      )}
      {variant === "chips" ? (
        <ul className="flex flex-wrap gap-2" role="list">
          {visible.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i}>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm", !it.available && "opacity-50 line-through")}>
                  {I ? <I className="h-4 w-4" aria-hidden="true" /> : null}
                  {it.title}
                </span>
              </li>
            );
          })}
        </ul>
      ) : variant === "checklist" ? (
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {visible.map((it, i) => (
            <li key={i} className={cn("flex items-start gap-2 text-sm", !it.available && "opacity-50")}>
              {it.available ? (
                <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>
                <span className="font-medium">{it.title}</span>
                {it.description ? <span className="text-muted-foreground"> — {it.description}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : variant === "columns" ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {visible.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <div key={i} className={cn("flex gap-3", !it.available && "opacity-50")}>
                {I ? (
                  <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <I className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : null}
                <div>
                  <p className="font-semibold">{it.title}</p>
                  {it.description ? <p className="text-sm text-muted-foreground">{it.description}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className={cn("grid gap-4", colCls)} role="list">
          {visible.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i} className={cn("rounded-xl border border-border bg-card p-4", !it.available && "opacity-50")}>
                {I ? (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <I className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : null}
                <p className="mt-3 font-semibold">{it.title}</p>
                {it.description ? <p className="mt-1 text-sm text-muted-foreground">{it.description}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}