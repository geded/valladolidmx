import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityCardProps {
  to?: string;
  eyebrow?: string;
  title: string;
  meta?: string;
  description?: string;
  media?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * EntityCard — unidad atómica de contenido del Workspace.
 * Toda la superficie es target cuando se provee `to`.
 * Target táctil ≥ 44px, estado `pressed` para feedback.
 */
export function EntityCard({
  to,
  eyebrow,
  title,
  meta,
  description,
  media,
  badge,
  actions,
  className,
}: EntityCardProps) {
  const body = (
    <div
      className={cn(
        "group relative flex min-h-[44px] flex-col gap-3 rounded-2xl border border-border bg-surface p-5 ws-shadow-card transition",
        "hover:bg-surface-raised hover:border-border-strong",
        "active:scale-[0.99] active:opacity-95",
        "focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      {media ? <div className="overflow-hidden rounded-xl">{media}</div> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h3 className="mt-0.5 truncate font-display text-base leading-tight">{title}</h3>
          {meta ? <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actions ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
      {to ? (
        <ChevronRight
          className="absolute right-4 top-5 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </div>
  );

  if (!to) return body;
  return (
    <Link to={to} className="block focus:outline-none">
      {body}
    </Link>
  );
}