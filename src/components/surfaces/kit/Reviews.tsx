import type { ReviewVM } from "./types";
import { clampRating } from "./format";

function Stars({ rating }: { rating: number }) {
  const full = clampRating(rating);
  return (
    <span aria-label={`${full} de 5`} className="text-primary">
      {"★".repeat(full)}
      <span className="text-muted-foreground">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function KitReviews({
  reviews,
  heading = "Opiniones",
  emptyLabel = "Sin opiniones publicadas todavia.",
}: {
  reviews: ReviewVM[];
  heading?: string;
  emptyLabel?: string;
}) {
  if (!reviews || reviews.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      </section>
    );
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <ul className="mt-4 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{r.author}</p>
              <Stars rating={r.rating} />
            </div>
            {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
            <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
              {r.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}