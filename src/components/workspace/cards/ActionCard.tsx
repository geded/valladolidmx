import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  tone?: "primary" | "selva" | "cenote" | "atardecer" | "muted";
  className?: string;
}

const TONE: Record<NonNullable<ActionCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  selva: "bg-selva/15 text-selva",
  cenote: "bg-cenote/15 text-cenote",
  atardecer: "bg-atardecer/15 text-atardecer",
  muted: "bg-muted text-muted-foreground",
};

export function ActionCard({
  icon: Icon,
  title,
  description,
  to,
  onClick,
  tone = "primary",
  className,
}: ActionCardProps) {
  const body = (
    <div
      className={cn(
        "flex min-h-[88px] items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition",
        "hover:bg-surface-raised hover:border-border-strong active:scale-[0.99]",
        className,
      )}
    >
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE[tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-semibold">{title}</div>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );

  if (to) return <Link to={to as never}>{body}</Link>;
  return (
    <button type="button" onClick={onClick} className="block w-full">
      {body}
    </button>
  );
}