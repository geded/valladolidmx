import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { CrumbVM } from "@/components/surfaces/kit/types";
import { cn } from "@/lib/utils";

export function PremiumTerritorialBreadcrumb({ crumbs }: { crumbs: readonly CrumbVM[] }) {
  return (
    <nav aria-label="Ruta territorial" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
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
