import type { PropsWithChildren } from "react";
import type { PremiumSectionVM } from "./types";
import { cn } from "@/lib/utils";

export function PremiumSection({
  vm,
  children,
  compact = false,
}: PropsWithChildren<{ vm: PremiumSectionVM; compact?: boolean }>) {
  return (
    <section
      id={vm.id}
      aria-labelledby={`${vm.id}-title`}
      className={cn(
        "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12",
        compact ? "py-10" : "py-16 lg:py-24",
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
        <header>
          {vm.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {vm.eyebrow}
            </p>
          ) : null}
          <h2 id={`${vm.id}-title`} className="mt-2 text-balance font-serif text-3xl sm:text-4xl">
            {vm.title}
          </h2>
          {vm.description ? (
            <p className="mt-4 max-w-xl text-pretty leading-7 text-muted-foreground">
              {vm.description}
            </p>
          ) : null}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
