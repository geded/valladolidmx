/**
 * ResenaCard — Tarjeta de testimonio. Reutilizable en cualquier sección.
 */
import { Star, Quote } from "lucide-react";
import type { Review } from "@/types/entities";

export function ResenaCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <Quote className="size-6 text-primary/60" aria-hidden />
      <p className="text-base leading-relaxed text-foreground">{review.body}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-sm font-semibold">{review.author_name}</p>
          <p className="text-xs text-muted-foreground">{review.author_origin}</p>
        </div>
        <div className="flex gap-0.5" aria-label={`${review.rating} de 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={i < review.rating ? "size-4 fill-primary text-primary" : "size-4 text-muted"}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </article>
  );
}
