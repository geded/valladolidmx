/**
 * G4-SYSTEM-01 · Tarjeta premium compartida.
 *
 * Presentación dual sobre el mismo view-model:
 *  - `editorial`: foto + panel sólido inferior (texto nunca sobre foto).
 *  - `cinematic`: foto con scrim sólido y título en superficie opaca.
 */
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PremiumBadges } from "./PremiumBadges";
import type { PremiumPresentation } from "@/lib/omxds/presentation/premium-presentation";
import type { PremiumCardVM } from "@/lib/omxds/presentation/premium-view-models";

export function PremiumCard({
  vm,
  presentation,
  className,
}: {
  vm: PremiumCardVM;
  presentation: PremiumPresentation;
  className?: string;
}) {
  const cinematic = presentation === "cinematic";
  const body = (
    <article
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-soft transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      <div className="relative">
        {vm.media ? (
          <img
            src={vm.media.url}
            alt={vm.media.alt}
            loading="lazy"
            className={cn(
              "w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
              cinematic ? "h-48 sm:h-56" : "h-40 sm:h-44",
            )}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            Sin fotografía acreditada
          </div>
        )}
        {cinematic ? (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 bg-card p-4">
        {vm.eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {vm.eyebrow}
          </p>
        ) : null}
        <h3 className="text-pretty font-serif text-base font-semibold leading-snug text-foreground sm:text-lg">
          {vm.title}
        </h3>
        {vm.tagline ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{vm.tagline}</p>
        ) : null}
        <PremiumBadges items={vm.badges} />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          {vm.meta ? <span className="text-xs text-muted-foreground">{vm.meta}</span> : <span />}
          {vm.actions}
        </div>
      </div>
    </article>
  );

  if (!vm.href) return body;
  return (
    <Link
      to={vm.href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}
