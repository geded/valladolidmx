import type { ReviewStatsVM, ReviewVM } from "./types";
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

const VERIFIED_LABEL: Record<NonNullable<ReviewVM["verifiedSource"]>, string> = {
  verified_purchase: "Compra verificada",
  managed_visit: "Visita gestionada",
  verified_visit: "Visita verificada",
  declared_visitor: "Visitante declarado",
};

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "long" }).format(
      new Date(iso),
    );
  } catch {
    return null;
  }
}

function StatsSummary({ stats }: { stats: ReviewStatsVM }) {
  if (stats.count === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground">
          {stats.average.toFixed(1)}
        </span>
        <Stars rating={Math.round(stats.average)} />
      </div>
      <span className="text-sm text-muted-foreground">
        {stats.count} {stats.count === 1 ? "opinión" : "opiniones"}
        {stats.verifiedCount > 0
          ? ` · ${stats.verifiedCount} verificada${stats.verifiedCount === 1 ? "" : "s"}`
          : ""}
      </span>
    </div>
  );
}

export function KitReviews({
  reviews,
  stats,
  heading = "Opiniones",
  emptyLabel = "Sin opiniones publicadas todavia.",
}: {
  reviews: ReviewVM[];
  stats?: ReviewStatsVM;
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
      {stats ? <StatsSummary stats={stats} /> : null}
      <ul className="mt-4 space-y-4">
        {reviews.map((r) => {
          const published = formatDate(r.publishedAt ?? null);
          const verifiedLabel = r.verifiedSource
            ? VERIFIED_LABEL[r.verifiedSource]
            : null;
          const isTrusted =
            r.verifiedSource === "verified_purchase" ||
            r.verifiedSource === "managed_visit" ||
            r.verifiedSource === "verified_visit";
          return (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{r.author}</p>
                <Stars rating={r.rating} />
              </div>
              {(published || verifiedLabel) && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {published && <span>{published}</span>}
                  {verifiedLabel && (
                    <span
                      className={
                        isTrusted
                          ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary"
                          : "rounded-full border border-border bg-muted px-2 py-0.5"
                      }
                    >
                      {verifiedLabel}
                    </span>
                  )}
                </p>
              )}
              {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
                {r.body}
              </p>
              {r.businessResponse ? (
                <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Respuesta del negocio
                    {r.businessResponseAt
                      ? ` · ${formatDate(r.businessResponseAt) ?? ""}`
                      : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
                    {r.businessResponse}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}