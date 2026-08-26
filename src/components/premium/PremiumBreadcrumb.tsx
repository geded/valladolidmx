/**
 * G4-SYSTEM-01 · Breadcrumb territorial canónico.
 * Inicio → Oriente Maya de Yucatán → Destino → (…).
 */
import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PremiumCrumb } from "@/lib/omxds/presentation/premium-presentation";

export function PremiumBreadcrumb({
  crumbs,
  className,
}: {
  crumbs: readonly PremiumCrumb[];
  className?: string;
}) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Ruta territorial" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <li className="flex min-w-0 items-center gap-1.5">
                {index === 0 ? <Home aria-hidden className="h-3.5 w-3.5 shrink-0" /> : null}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="truncate rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn("truncate", isLast && "font-medium text-foreground")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden className="text-muted-foreground/60">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
