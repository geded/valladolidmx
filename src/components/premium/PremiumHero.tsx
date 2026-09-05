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
            <h1 className="relative mt-3 max-w-3xl font-serif text-display-hero">
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
        // Móvil ≤639px: proporción ~4:5 acotada a 500px para evitar el
        // hero-tira; desde `sm` se conserva la altura aprobada.
        cinematic
          ? "min-h-[min(125vw,500px)] sm:min-h-[78svh]"
          : "min-h-[min(125vw,500px)] sm:min-h-[34rem] lg:min-h-[42rem]",

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
              : // Móvil: degradado vertical (el texto se apoya abajo).
                "bg-gradient-to-t from-black/90 via-black/50 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/55 sm:to-black/10"
            : cinematic
              ? "bg-gradient-to-t from-stone-950/80 via-stone-900/40 to-transparent"
              : "bg-gradient-to-t from-stone-950/80 via-stone-900/40 to-transparent sm:bg-gradient-to-r sm:from-stone-950/70 sm:via-stone-900/35 sm:to-transparent",
        )}
      />

      <div
        className={cn(
          "mx-auto flex min-h-[inherit] w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12",
          cinematic ? "items-end justify-center text-center" : "items-end sm:items-center",
        )}
      >
        <div className={cn("w-full max-w-3xl", cinematic && "mx-auto")}>
          {vm.crumbs?.length ? (
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-white/75 sm:mb-8">
              {vm.crumbs.map((crumb) => crumb.label).join(" → ")}
            </p>
          ) : null}
          {vm.eyebrow ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300 sm:mb-3 sm:text-xs">
              {vm.eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance font-serif text-[clamp(1.9rem,8.5vw,2.5rem)] leading-[1.02] sm:text-5xl sm:leading-[0.98] lg:text-7xl">
            {vm.title}
          </h1>
          {vm.description ? (
            <p className="mt-3 line-clamp-3 max-w-2xl text-pretty text-sm leading-6 text-white/85 sm:mt-6 sm:line-clamp-none sm:text-lg sm:leading-7">
              {vm.description}
            </p>
          ) : null}
          {vm.badges?.length ? (
            <ul className="mt-4 flex flex-wrap gap-2 sm:mt-6" aria-label="Distinciones">
              {vm.badges.map((badge, index) => (
                <li
                  key={badge.label}
                  className={cn(
                    "rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs backdrop-blur",
                    // Móvil: sólo 2 distintivos visibles + resumen “+N”.
                    index > 1 && "hidden sm:block",
                  )}
                >
                  {badge.label}
                </li>
              ))}
              {vm.badges.length > 2 ? (
                <li className="rounded-full border border-white/30 bg-black/35 px-3 py-1 text-xs backdrop-blur sm:hidden">
                  +{vm.badges.length - 2}
                </li>
              ) : null}
            </ul>
          ) : null}
          {vm.primaryAction || vm.secondaryAction ? (
            <div
              className={cn(
                "mt-5 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3",
                cinematic && "sm:justify-center",
              )}
            >
              {vm.primaryAction ? (
                <PremiumAction action={vm.primaryAction} className="w-full sm:w-auto" />
              ) : null}
              {vm.secondaryAction ? (
                <PremiumAction
                  action={vm.secondaryAction}
                  variant="outline"
                  /* Contraste AA sobre fotografía: borde y fondo propios. */
                  className="w-full border-white/70 bg-black/45 text-white backdrop-blur hover:bg-black/60 hover:text-white sm:w-auto"
                />
              ) : null}
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
