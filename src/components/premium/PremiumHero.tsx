import { PremiumAction } from "./PremiumAction";
import type { PremiumHeroVM } from "./types";
import { cn } from "@/lib/utils";

export function PremiumHero({
  vm,
  layout = "default",
}: {
  vm: PremiumHeroVM;
  /** La variante listing pertenece al mismo bloque; no crea otro hero. */
  layout?: "default" | "listing";
}) {
  const cinematic = vm.presentation === "cinematic";
  const hasMedia = Boolean(vm.media);
  const listing = layout === "listing";

  if (listing) {
    return (
      <section
        data-premium-presentation={vm.presentation}
        data-premium-media={hasMedia ? "governed" : "fallback"}
        data-premium-layout="listing"
        className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft"
      >
        <div
          className={cn(
            "grid min-h-[21rem]",
            hasMedia && "lg:grid-cols-[1.06fr_.94fr]",
            cinematic && hasMedia && "min-h-[32rem] lg:grid-cols-1",
          )}
        >
          {hasMedia ? (
            <div
              className={cn(
                "relative min-h-56 overflow-hidden bg-muted",
                cinematic && "absolute inset-0 -z-20 min-h-0",
              )}
            >
              <img
                src={vm.media?.url}
                alt={vm.media?.alt ?? ""}
                className="size-full object-cover"
              />
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0",
                  cinematic
                    ? "bg-gradient-to-t from-[#0f382b]/95 via-[#0f382b]/55 to-black/10"
                    : "bg-gradient-to-t from-black/25 to-transparent",
                )}
              />
            </div>
          ) : null}

          <div
            className={cn(
              "relative flex flex-col justify-center overflow-hidden bg-[#123e2f] px-6 py-9 text-white sm:px-9 lg:px-11",
              cinematic &&
                "min-h-[32rem] items-center justify-end bg-transparent pb-12 text-center",
            )}
          >
            <div
              aria-hidden
              className="absolute -right-20 -top-20 size-64 rounded-full border border-white/10"
            />
            {vm.eyebrow ? (
              <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-[#edb84f]">
                {vm.eyebrow}
              </p>
            ) : null}
            <h1 className="relative mt-3 max-w-3xl text-balance font-serif text-4xl leading-[0.98] sm:text-5xl lg:text-6xl">
              {vm.title}
            </h1>
            {vm.description ? (
              <p className="relative mt-5 max-w-2xl text-pretty text-base leading-7 text-white/85 sm:text-lg">
                {vm.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-premium-presentation={vm.presentation}
      data-premium-media={hasMedia ? "governed" : "fallback"}
      className={cn(
        "relative isolate overflow-hidden text-white",
        // D-05 · sin medio gobernado no se muestra un rectángulo negro:
        // degradado cálido piedra/caliza que conserva contraste AA.
        hasMedia ? "bg-stone-950" : "bg-gradient-to-br from-stone-800 via-stone-700 to-amber-900",
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
      {/* G8-F1D · Atribución acreditada. Sólo se muestra cuando el medio
          gobernado declara caption o crédito; nunca se inventa. */}
      {vm.media?.caption || vm.media?.credit ? (
        <p className="absolute bottom-2 right-3 z-10 max-w-[85%] text-right text-[11px] leading-tight text-white/85 sm:bottom-3 sm:text-xs">
          {vm.media.caption ? <span className="block">{vm.media.caption}</span> : null}
          {vm.media.credit ? (
            <span className="block">
              <span className="sr-only">Crédito de la imagen: </span>
              {vm.media.credit}
            </span>
          ) : null}
        </p>
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
