import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number; // %
  hint?: string;
  intent?: "neutral" | "positive" | "warning" | "danger";
  icon?: ReactNode;
  className?: string;
}

const INTENT: Record<NonNullable<MetricCardProps["intent"]>, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function MetricCard({
  label,
  value,
  delta,
  hint,
  intent = "neutral",
  icon,
  className,
}: MetricCardProps) {
  const TrendIcon = delta === undefined ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendTone =
    delta === undefined
      ? "text-muted-foreground"
      : delta > 0
        ? "text-success"
        : delta < 0
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 ws-shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <span className="truncate">{label}</span>
        {icon ? <span className="text-muted-foreground/80">{icon}</span> : null}
      </div>
      <div className={cn("mt-2 font-display text-3xl tabular-nums", INTENT[intent])}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <TrendIcon className={cn("h-3.5 w-3.5", trendTone)} aria-hidden />
        {delta !== undefined ? (
          <span className={trendTone}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}%</span>
        ) : null}
        {hint ? <span className="text-muted-foreground">· {hint}</span> : null}
      </div>
    </div>
  );
}