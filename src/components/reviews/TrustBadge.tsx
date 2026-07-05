/**
 * Trust Engine v1 · US-G.5 — TrustBadge.
 *
 * Insignia compacta de confianza para cards y listados. Consume
 * `getReviewStats` (RPC público) por sujeto y renderiza:
 *   - Promedio (1 decimal) + N opiniones
 *   - Marca de "verificado" cuando al menos una reseña procede de una
 *     compra/visita gestionada.
 *
 * Si el sujeto no tiene reseñas publicadas todavía, el componente NO
 * renderiza nada — evita ruido visual en el ecosistema temprano.
 *
 * Nota: hoy hace una consulta por sujeto (usa TanStack Query con clave
 * por (kind,id) para dedupe/cachear). Batch server-side queda para una
 * ola posterior sin cambio de contrato.
 */
import { Star, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";
import {
  getReviewStats,
  type PublicReviewSubjectKind,
  type PublicReviewStats,
} from "@/lib/reviews/public-reads.functions";

export interface TrustBadgeProps {
  subjectKind: PublicReviewSubjectKind;
  subjectId: string;
  size?: "sm" | "md";
  className?: string;
  /** Cuando el stats ya se hidrató en un ancestro, evita la query. */
  initialData?: PublicReviewStats;
}

export function TrustBadge({
  subjectKind,
  subjectId,
  size = "sm",
  className,
  initialData,
}: TrustBadgeProps) {
  const statsFn = useServerFn(getReviewStats);
  const { data } = useQuery({
    queryKey: ["review-stats", subjectKind, subjectId],
    queryFn: () => statsFn({ data: { subjectKind, subjectId } }),
    initialData,
    staleTime: 60_000,
  });

  if (!data || data.count === 0) return null;

  const isCompact = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2 py-0.5 font-medium",
        isCompact ? "text-[11px]" : "text-xs",
        className,
      )}
      aria-label={`Calificación ${data.average.toFixed(1)} de 5 basada en ${data.count} reseñas`}
    >
      <Star
        className={cn(
          isCompact ? "h-3 w-3" : "h-3.5 w-3.5",
          "fill-amber-500 text-amber-500",
        )}
        aria-hidden
      />
      <span className="tabular-nums">{data.average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        · {data.count} {data.count === 1 ? "reseña" : "reseñas"}
      </span>
      {data.verifiedCount > 0 ? (
        <>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span
            className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400"
            title={`${data.verifiedCount} verificada${data.verifiedCount === 1 ? "" : "s"}`}
          >
            <ShieldCheck className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
            {data.verifiedCount}
          </span>
        </>
      ) : null}
    </span>
  );
}