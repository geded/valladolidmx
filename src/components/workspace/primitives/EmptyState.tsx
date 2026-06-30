import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyVariant = "first-run" | "filtered" | "permission" | "error";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: EmptyVariant;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

const TONE: Record<EmptyVariant, string> = {
  "first-run": "text-primary",
  filtered: "text-info",
  permission: "text-warning",
  error: "text-destructive",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = "first-run",
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div className={cn("mb-4 grid size-12 place-items-center rounded-full bg-muted", TONE[variant])}>
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="font-display text-lg">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}