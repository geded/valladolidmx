import type { PromoVM } from "./types";

export function KitPromos({
  promotions,
  heading = "Promociones vigentes",
  gated = false,
  gatedLabel = "Las promociones estan disponibles en planes superiores.",
}: {
  promotions: PromoVM[];
  heading?: string;
  gated?: boolean;
  gatedLabel?: string;
}) {
  if (gated) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{gatedLabel}</p>
      </section>
    );
  }
  if (!promotions || promotions.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {promotions.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              {p.discountPercent != null ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  −{p.discountPercent}%
                </span>
              ) : null}
            </div>
            {p.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                {p.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}