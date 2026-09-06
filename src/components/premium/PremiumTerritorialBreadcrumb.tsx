import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import type { CrumbVM } from "@/components/surfaces/kit/types";
import type { BreadcrumbCrumb } from "@/types/territory";
import { CompactCrumbs, shouldCompactCrumbs } from "@/components/layout/CompactCrumbs";
import { cn } from "@/lib/utils";

export interface PremiumTerritorialBreadcrumbProps {
  crumbs: readonly CrumbVM[];
  /**
   * Progressive disclosure ≤639px con la misma primitiva compartida que
   * `BreadcrumbTerritorial`. Sólo aplica a cadenas de 4+ niveles.
   */
  compactOnMobile?: boolean;
  /** Índice de la miga que permanece visible en móvil (override). */
  mobileAnchorIndex?: number;
}

function toTerritorialCrumbs(crumbs: readonly CrumbVM[]): readonly BreadcrumbCrumb[] {
  return crumbs.map((c) => ({ label: c.label, to: c.href }));
}

export function PremiumTerritorialBreadcrumb({
  crumbs,
  compactOnMobile = false,
  mobileAnchorIndex,
}: PremiumTerritorialBreadcrumbProps) {
  const territorial = toTerritorialCrumbs(crumbs);
  const compact = compactOnMobile && shouldCompactCrumbs(territorial);

  return (
    <nav aria-label="Ruta territorial" className="overflow-x-auto text-sm [scrollbar-width:none]">
      {compact ? <CompactCrumbs crumbs={territorial} anchorIndex={mobileAnchorIndex} /> : null}
      <ol
        className={cn(
          "flex min-w-max flex-nowrap items-center gap-1.5 whitespace-nowrap text-muted-foreground sm:min-w-0 sm:flex-wrap sm:whitespace-normal",
          compact ? "hidden sm:flex" : null,
        )}
      >
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="contents">
              {index > 0 ? <ChevronRight className="size-3.5 opacity-50" aria-hidden /> : null}
              {crumb.href && !current ? (
                <Link
                  to={crumb.href}
                  className="inline-flex min-h-11 items-center rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
                >
                  {index === 0 ? <Home className="mr-1.5 size-4" aria-hidden /> : null}
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center",
                    current ? "font-medium text-foreground" : undefined,
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
