import type { BadgeVM } from "./types";

const TONE: Record<NonNullable<BadgeVM["tone"]>, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  danger: "bg-destructive/10 text-destructive",
};

export function KitBadge({ vm }: { vm: BadgeVM }) {
  const tone = TONE[vm.tone ?? "primary"];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}
    >
      {vm.icon}
      {vm.label}
    </span>
  );
}

export function KitBadges({ items }: { items?: BadgeVM[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((b, i) => (
        <KitBadge key={`${b.label}-${i}`} vm={b} />
      ))}
    </div>
  );
}