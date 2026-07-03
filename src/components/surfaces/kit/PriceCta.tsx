import type { PriceCtaVM } from "./types";
import { formatPrice, humanize } from "./format";

export function KitPriceCta({ vm }: { vm: PriceCtaVM }) {
  const price = formatPrice(vm.price ?? null);
  const stickyCls = vm.sticky ? "md:sticky md:top-20" : "";
  return (
    <section
      className={`mt-8 rounded-2xl border border-border bg-card p-5 ${stickyCls}`.trim()}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          {price ? (
            <p className="text-2xl font-semibold">{price}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {vm.fallbackLabel ?? "Precio bajo consulta"}
            </p>
          )}
          {vm.mode ? (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {humanize(vm.mode)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{vm.actions}</div>
    </section>
  );
}