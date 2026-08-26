/**
 * G4-SYSTEM-01 · Hero premium compartido.
 *
 * Una sola familia de Hero con dos PRESENTACIONES sobre el mismo
 * view-model (Tourist Hero Policy):
 *  - `editorial`: composición 40/60 con panel sólido; el texto nunca
 *    vive sobre la fotografía.
 *  - `cinematic`: media inmersiva con scrim sólido inferior y contraste
 *    reforzado; sin párrafos largos sobre la foto.
 */
import { cn } from "@/lib/utils";
import { PremiumBadges } from "./PremiumBadges";
import type { PremiumPresentation } from "@/lib/omxds/presentation/premium-presentation";
import type { PremiumFactVM, PremiumHeroVM } from "@/lib/omxds/presentation/premium-view-models";

function Facts({ facts, compact }: { facts?: readonly PremiumFactVM[]; compact?: boolean }) {
  if (!facts || facts.length === 0) return null;
  return (
    <dl
      className={cn("grid gap-x-6 gap-y-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {fact.icon}
            {fact.label}
          </dt>
          <dd className="mt-1 truncate text-sm font-medium text-foreground">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Copy({ vm, compact }: { vm: PremiumHeroVM; compact?: boolean }) {
  return (
    <div className="min-w-0">
      {vm.eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary sm:text-xs">
          {vm.eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "mt-2 text-balance font-serif font-semibold leading-[1.08] text-foreground",
          compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl",
        )}
      >
        {vm.title}
      </h1>
      {vm.subtitle ? (
        <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {vm.subtitle}
        </p>
      ) : null}
      <PremiumBadges items={vm.badges} className="mt-4" />
      {vm.actions ? <div className="mt-5 flex flex-wrap gap-2">{vm.actions}</div> : null}
      <div className="mt-6">
        <Facts facts={vm.facts} compact={compact} />
      </div>
    </div>
  );
}

export function PremiumHero({
  vm,
  presentation,
  className,
}: {
  vm: PremiumHeroVM;
  presentation: PremiumPresentation;
  className?: string;
}) {
  const cover = vm.cover;

  if (presentation === "cinematic" && cover) {
    return (
      <section className={cn("overflow-hidden rounded-3xl bg-card shadow-elevated", className)}>
        <div className="relative">
          <img
            src={cover.url}
            alt={cover.alt}
            className="h-[46vw] max-h-[520px] min-h-[240px] w-full object-cover"
            loading="eager"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent"
          />
        </div>
        <div className="relative -mt-16 px-5 pb-6 sm:-mt-20 sm:px-8 sm:pb-8">
          <div className="rounded-2xl bg-card/95 p-5 shadow-soft backdrop-blur sm:p-7">
            <Copy vm={vm} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-3xl bg-card shadow-elevated", className)}>
      <div className="grid gap-0 lg:grid-cols-5">
        <div className="order-2 p-5 sm:p-8 lg:order-1 lg:col-span-2 lg:self-center">
          <Copy vm={vm} compact />
        </div>
        <div className="order-1 lg:order-2 lg:col-span-3">
          {cover ? (
            <img
              src={cover.url}
              alt={cover.alt}
              className="h-56 w-full object-cover sm:h-80 lg:h-full lg:min-h-[420px]"
              loading="eager"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-muted text-sm text-muted-foreground sm:h-80">
              Sin fotografía acreditada
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
