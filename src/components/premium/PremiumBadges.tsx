/**
 * G4-SYSTEM-01 · Distintivos del runtime premium.
 *
 * El distintivo Pueblo Mágico sólo se dibuja con asset acreditado
 * (`assetUrl`); en su ausencia se presenta como estado editorial
 * textual. Prohibido imitar o reconstruir el logotipo oficial.
 */
import { cn } from "@/lib/utils";
import type { PremiumBadgeVM } from "@/lib/omxds/presentation/premium-view-models";

const TONES: Record<NonNullable<PremiumBadgeVM["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  institutional: "bg-secondary text-secondary-foreground",
};

export function PremiumBadge({ badge, className }: { badge: PremiumBadgeVM; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium leading-none sm:text-xs",
        TONES[badge.tone ?? "institutional"],
        className,
      )}
    >
      {badge.assetUrl ? (
        <img src={badge.assetUrl} alt="" aria-hidden className="h-3.5 w-auto" loading="lazy" />
      ) : null}
      {badge.label}
    </span>
  );
}

export function PremiumBadges({
  items,
  className,
}: {
  items?: readonly PremiumBadgeVM[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((badge) => (
        <PremiumBadge key={badge.label} badge={badge} />
      ))}
    </div>
  );
}
