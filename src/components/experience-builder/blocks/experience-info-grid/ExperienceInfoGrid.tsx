/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid` (Capa 1: Presentación).
 */
import { Clock, MapPin, Phone, Star, Tag, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExperienceInfoGridDTO } from "@/lib/experience-builder/blocks/experience-info-grid/contract";

const ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  "map-pin": MapPin,
  phone: Phone,
  star: Star,
  tag: Tag,
  users: Users,
};

const TONE: Record<string, string> = {
  default: "text-foreground",
  primary: "text-primary",
  accent: "text-accent-foreground",
  warning: "text-amber-600",
};

export interface ExperienceInfoGridProps {
  dto: ExperienceInfoGridDTO;
  className?: string;
}

export function ExperienceInfoGrid({ dto, className }: ExperienceInfoGridProps) {
  const { items, heading, columns, variant, ariaLabel } = dto;
  if (items.length === 0) return null;

  const colCls =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <section aria-label={ariaLabel} data-eb-block="experience-info-grid" className={cn("w-full", className)}>
      {heading ? (
        <h2 className="mb-4 text-xl font-semibold tracking-tight">{heading}</h2>
      ) : null}
      {variant === "inline" ? (
        <ul className="flex flex-wrap gap-2" role="list">
          {items.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i}>
                <MaybeLink href={it.href} className={cn("inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-1.5 text-sm", TONE[it.tone])}>
                  {I ? <I className="h-4 w-4" aria-hidden="true" /> : null}
                  <span className="font-medium">{it.label}:</span> <span>{it.value}</span>
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      ) : variant === "list" ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-background" role="list">
          {items.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {I ? <I className="h-4 w-4" aria-hidden="true" /> : null}
                  {it.label}
                </span>
                <MaybeLink href={it.href} className={cn("text-sm font-medium", TONE[it.tone])}>
                  {it.value}
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className={cn("grid gap-3", colCls)} role="list">
          {items.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {I ? <I className="h-4 w-4" aria-hidden="true" /> : null}
                  {it.label}
                </div>
                <MaybeLink href={it.href} className={cn("mt-1 block text-base font-semibold", TONE[it.tone])}>
                  {it.value}
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MaybeLink({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} className={cn(className, "hover:underline")}>
      {children}
    </a>
  );
}