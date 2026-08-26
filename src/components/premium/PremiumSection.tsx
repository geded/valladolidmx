/**
 * G4-SYSTEM-01 · Encabezado de sección premium.
 * Ritmo editorial compartido por todas las familias.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PremiumSectionVM } from "@/lib/omxds/presentation/premium-view-models";

export function PremiumSection({
  vm,
  children,
  className,
}: {
  vm: PremiumSectionVM;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={vm.id} className={cn("scroll-mt-24", className)}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          {vm.eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              {vm.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-balance font-serif text-xl font-semibold text-foreground sm:text-2xl lg:text-3xl">
            {vm.title}
          </h2>
          {vm.description ? (
            <p className="mt-2 max-w-prose text-pretty text-sm text-muted-foreground">
              {vm.description}
            </p>
          ) : null}
        </div>
        {vm.action ? <div className="shrink-0">{vm.action}</div> : null}
      </header>
      {children}
    </section>
  );
}
