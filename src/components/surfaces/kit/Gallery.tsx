import type { GalleryVM } from "./types";

export function KitGallery({ vm }: { vm: GalleryVM }) {
  const cover = vm.cover ?? null;
  const items = vm.items ?? [];
  if (!cover && items.length === 0) {
    return (
      <section className="mt-8">
        <div
          className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border"
          aria-hidden
        />
        {vm.emptyLabel ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {vm.emptyLabel}
          </p>
        ) : null}
      </section>
    );
  }
  return (
    <section className="mt-8 space-y-3">
      {cover?.url ? (
        <img
          src={cover.url}
          alt={cover.alt ?? vm.fallbackAlt ?? ""}
          className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-border"
          loading="eager"
        />
      ) : (
        <div
          className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-muted to-muted/60 ring-1 ring-border"
          aria-hidden
        />
      )}
      {items.length > 0 ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {items.map((m, i) => (
            <li
              key={m.id ?? `${m.url}-${i}`}
              className="w-[72%] shrink-0 snap-center overflow-hidden rounded-xl ring-1 ring-border sm:w-auto"
            >
              {m.url ? (
                <img
                  src={m.url}
                  alt={m.alt ?? vm.fallbackAlt ?? ""}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-muted" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}