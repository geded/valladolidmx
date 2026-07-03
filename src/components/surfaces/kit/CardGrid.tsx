import type { CardGridVM, CardVM } from "./types";
import { formatPrice } from "./format";
import { KitBadges } from "./Badges";

const COLS: Record<NonNullable<CardGridVM["columns"]>, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 md:grid-cols-3",
  4: "sm:grid-cols-2 md:grid-cols-4",
};

function Card({ vm }: { vm: CardVM }) {
  const price = formatPrice(vm.price ?? null);
  const title = vm.href ? (
    <a href={vm.href} className="block font-semibold hover:underline">
      {vm.title}
    </a>
  ) : (
    <span className="block font-semibold">{vm.title}</span>
  );
  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      {vm.media?.url ? (
        <img
          src={vm.media.url}
          alt={vm.media.alt ?? ""}
          className="mb-3 aspect-[4/3] w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : null}
      {vm.eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {vm.eyebrow}
        </p>
      ) : null}
      <div className="mt-1">{title}</div>
      {vm.tagline ? (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {vm.tagline}
        </p>
      ) : null}
      {vm.badges && vm.badges.length > 0 ? (
        <div className="mt-2">
          <KitBadges items={vm.badges} />
        </div>
      ) : null}
      {price ? <p className="mt-2 text-sm font-medium">{price}</p> : null}
      {vm.actions ? <div className="mt-3">{vm.actions}</div> : null}
    </li>
  );
}

export function KitCardGrid({ vm }: { vm: CardGridVM }) {
  if (!vm.items || vm.items.length === 0) {
    if (!vm.emptyLabel) return null;
    return (
      <p className="mt-4 text-sm text-muted-foreground">{vm.emptyLabel}</p>
    );
  }
  const cols = COLS[vm.columns ?? 3];
  return (
    <ul className={`mt-4 grid gap-4 ${cols}`}>
      {vm.items.map((c) => (
        <Card key={c.id} vm={c} />
      ))}
    </ul>
  );
}