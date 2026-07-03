import type { HeroVM } from "./types";
import { KitBadges } from "./Badges";

export function KitHero({ vm }: { vm: HeroVM }) {
  const hasFooter = (vm.badges && vm.badges.length > 0) || !!vm.actions;
  return (
    <header className="mb-8">
      {vm.eyebrow ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {vm.eyebrow}
        </p>
      ) : null}
      <h1 className="text-balance text-3xl md:text-4xl font-semibold">
        {vm.title}
      </h1>
      {vm.subtitle ? (
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {vm.subtitle}
        </p>
      ) : null}
      {hasFooter ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <KitBadges items={vm.badges} />
          {vm.actions}
        </div>
      ) : null}
    </header>
  );
}