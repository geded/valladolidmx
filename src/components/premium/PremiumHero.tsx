import { PremiumAction } from "./PremiumAction";
import type { PremiumHeroVM } from "./types";
import { cn } from "@/lib/utils";

export function PremiumHero({ vm }: { vm: PremiumHeroVM }) {
  const cinematic = vm.presentation === "cinematic";
  const hasMedia = Boolean(vm.media);

  return (
    <section
      data-premium-presentation={vm.presentation}
      data-premium-media={hasMedia ? "governed" : "fallback"}
      className={cn(
        "relative isolate overflow-hidden text-white",
        // D-05 · sin medio gobernado no se muestra un rectángulo negro:
        // degradado cálido piedra/caliza que conserva contraste AA.
        hasMedia
          ? "bg-stone-950"
          : "bg-gradient-to-br from-stone-800 via-stone-700 to-amber-900",
        cinematic ? "min-h-[78svh]" : "min-h-[34rem] lg:min-h-[42rem]",
      )}
    >
      {vm.media ? (
        <img
          src={vm.media.url}
          alt={vm.media.alt ?? ""}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
      ) : null}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10",
          hasMedia
            ? cinematic
              ? "bg-gradient-to-t from-black via-black/45 to-black/10"
              : "bg-gradient-to-r from-black/85 via-black/55 to-black/10"
            : cinematic
              ? "bg-gradient-to-t from-stone-950/80 via-stone-900/40 to-transparent"
              : "bg-gradient-to-r from-stone-950/70 via-stone-900/35 to-transparent",
        )}
      />

      <div
        className={cn(
          "mx-auto flex min-h-[inherit] w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-12",
          cinematic ? "items-end justify-center text-center" : "items-center",
        )}
      >
        <div className={cn("max-w-3xl", cinematic && "mx-auto")}>
          {vm.crumbs?.length ? (
            <p className="mb-8 text-xs font-medium uppercase tracking-[0.16em] text-white/75">
              {vm.crumbs.map((crumb) => crumb.label).join(" → ")}
            </p>
          ) : null}
          {vm.eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              {vm.eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance font-serif text-4xl leading-[0.98] sm:text-5xl lg:text-7xl">
            {vm.title}
          </h1>
          {vm.description ? (
            <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-white/85 sm:text-lg">
              {vm.description}
            </p>
          ) : null}
          {vm.badges?.length ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Distinciones">
              {vm.badges.map((badge) => (
                <li
                  key={badge.label}
                  className="rounded-full border border-white/30 bg-black/25 px-3 py-1 text-xs backdrop-blur"
                >
                  {badge.label}
                </li>
              ))}
            </ul>
          ) : null}
          {vm.primaryAction || vm.secondaryAction ? (
            <div className={cn("mt-8 flex flex-wrap gap-3", cinematic && "justify-center")}>
              {vm.primaryAction ? <PremiumAction action={vm.primaryAction} /> : null}
              {vm.secondaryAction ? (
                <PremiumAction action={vm.secondaryAction} variant="outline" />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
