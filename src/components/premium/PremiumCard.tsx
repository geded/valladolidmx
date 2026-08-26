import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { PremiumCardVM } from "./types";

export function PremiumCard({ card }: { card: PremiumCardVM }) {
  const body = (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {card.media ? (
          <img
            src={card.media.url}
            alt={card.media.alt ?? ""}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="p-5 sm:p-6">
        {card.eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {card.eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex items-start justify-between gap-4">
          <h3 className="font-serif text-2xl leading-tight">{card.title}</h3>
          {card.href ? <ArrowUpRight className="mt-1 size-4 shrink-0" aria-hidden /> : null}
        </div>
        {card.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {card.description}
          </p>
        ) : null}
      </div>
    </article>
  );

  return card.href ? <Link to={card.href}>{body}</Link> : body;
}
