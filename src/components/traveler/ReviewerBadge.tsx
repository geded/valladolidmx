/**
 * ReviewerBadge — Distintivo "Reseñador verificado" (Ola 6.2).
 *
 * Se muestra cuando el viajero acumula ≥ REVIEWER_VERIFIED_THRESHOLD reseñas
 * con `verified_source = 'verified_redemption'` (canjes reales). Refuerza la
 * confianza pública y motiva a completar reseñas post-canje.
 */
import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { REVIEWER_VERIFIED_THRESHOLD } from "@/lib/reviews/reviewer-stats.functions";

export interface ReviewerBadgeProps {
  verifiedCount: number;
  isReviewerVerified: boolean;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  className?: string;
}

export function ReviewerBadge({
  verifiedCount,
  isReviewerVerified,
  size = "md",
  showProgress = false,
  className,
}: ReviewerBadgeProps) {
  const dims =
    size === "lg" ? "text-sm px-4 py-2" : size === "sm" ? "text-xs px-2.5 py-1" : "text-xs px-3 py-1.5";
  const iconSize = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (isReviewerVerified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50 font-medium text-amber-900 shadow-sm dark:bg-amber-950/40 dark:text-amber-200",
          dims,
          className,
        )}
        title={`${verifiedCount} reseñas verificadas por canje`}
      >
        <BadgeCheck className={cn(iconSize, "fill-amber-500 text-white")} aria-hidden />
        Reseñador verificado
        <span className="ml-0.5 opacity-70">· {verifiedCount}</span>
      </span>
    );
  }

  if (!showProgress || verifiedCount === 0) return null;
  const remaining = REVIEWER_VERIFIED_THRESHOLD - verifiedCount;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 font-medium text-muted-foreground",
        dims,
        className,
      )}
      title="Sigue reseñando canjes verificados para obtener el distintivo"
    >
      <Star className={cn(iconSize, "fill-current opacity-70")} aria-hidden />
      {verifiedCount}/{REVIEWER_VERIFIED_THRESHOLD} reseñas verificadas
      {remaining > 0 ? <span className="opacity-70">· faltan {remaining}</span> : null}
    </span>
  );
}
