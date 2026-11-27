/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid` (Capa 1: Presentación).
 */
import { Check, Clock, MapPin, Phone, Star, Tag, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";
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
  warning: "text-warning",
};

export interface ExperienceInfoGridProps {
  dto: ExperienceInfoGridDTO;
  className?: string;
}

export function ExperienceInfoGrid({ dto, className }: ExperienceInfoGridProps) {
  const { items, heading, columns, variant, ariaLabel } = dto;
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  // Celular: la lista de opciones se muestra en pastillas y se limita a 6 (con más de 8) hasta desplegarla.
  const MOBILE_LIMIT = 6;
  const MOBILE_COLLAPSE_AFTER = 8;
  const checklistIndex = new Map(items.map((it, i) => [it, i]));

  const colCls =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <section
      aria-label={ariaLabel}
      data-eb-block="experience-info-grid"
      className={cn("w-full", className)}
    >
      {heading ? <h2 className="mb-4 text-xl font-semibold tracking-tight">{heading}</h2> : null}
      {variant === "inline" ? (
        <ul className="flex flex-wrap gap-2" role="list">
          {items.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i}>
                <MaybeLink
                  href={it.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-1.5 text-sm",
                    TONE[it.tone],
                  )}
                >
                  {I ? <I className="h-4 w-4" aria-hidden="true" /> : null}
                  <span className="font-medium">{it.label}:</span> <span>{it.value}</span>
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      ) : variant === "checklist" ? (
        /* Amenidades y servicios: cada dato se lee como un elemento propio,
           agrupado por su eje administrable del CMS. */
        <div className="space-y-4 sm:space-y-6">
          {Array.from(
            items.reduce((acc, it) => {
              const group = acc.get(it.label) ?? [];
              group.push(it);
              acc.set(it.label, group);
              return acc;
            }, new Map<string, typeof items>()),
          ).map(([groupLabel, groupItems]) => (
            <div key={groupLabel}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {groupLabel}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2 sm:mt-3 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3" role="list">
                {groupItems.map((it, i) => {
                  const I = it.iconKey ? ICONS[it.iconKey] : null;
                  const hiddenOnMobile = !expanded && items.length > MOBILE_COLLAPSE_AFTER && (checklistIndex.get(it) ?? 0) >= MOBILE_LIMIT;
                  return (
                    <li
                      key={i}
                      className={cn(
                        "items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-1.5 sm:flex sm:items-start sm:gap-3 sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:px-0 sm:py-0 sm:pb-3 sm:last:border-b-0",
                        hiddenOnMobile ? "hidden" : "flex",
                      )}
                    >
                      {I ? (
                        <I
                          className="h-4 w-4 shrink-0 text-muted-foreground sm:mt-0.5 sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check
                          className="h-4 w-4 shrink-0 text-muted-foreground sm:mt-0.5 sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      )}
                      <span className={cn("min-w-0 text-sm leading-snug", TONE[it.tone])}>
                        {it.value}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {!expanded && items.length > MOBILE_COLLAPSE_AFTER ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-pill border border-border px-4 py-2 text-sm font-medium text-primary sm:hidden"
            >
              Ver las {items.length} opciones
            </button>
          ) : null}
        </div>
      ) : variant === "list" ? (
        <ul
          className="divide-y divide-border rounded-lg border border-border bg-background"
          role="list"
        >
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
        <ul className={cn("grid gap-2 sm:gap-3", colCls)} role="list">
          {items.map((it, i) => {
            const I = it.iconKey ? ICONS[it.iconKey] : null;
            return (
              <li key={i} className="min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-4">
                <div className="flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:gap-2 sm:text-xs sm:tracking-widest">
                  {I ? (
                    <I className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                  ) : null}
                  <span className="truncate">{it.label}</span>
                </div>
                <MaybeLink
                  href={it.href}
                  className={cn(
                    "mt-0.5 block text-sm font-semibold leading-snug sm:mt-1 sm:text-base",
                    TONE[it.tone],
                  )}
                >
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

function MaybeLink({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} className={cn(className, "hover:underline")}>
      {children}
    </a>
  );
}
