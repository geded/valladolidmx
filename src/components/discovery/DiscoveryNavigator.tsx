/**
 * H-02 · Iniciativa 2 — Discovery Navigator (presentational).
 *
 * Componente puro reutilizable en Destinos, Regiones, Micrositios,
 * Landings territoriales, Marketplace contextual y futuras superficies
 * públicas. Recibe items ya resueltos (server) y los presenta con
 * iconografía Lucide estándar.
 *
 * Contrato pensado para evolucionar: acepta `slots` opcional para
 * secciones futuras (promociones, eventos, Alux) sin romper API.
 */
import type { ReactNode } from "react";
import {
  BedDouble,
  Binoculars,
  CalendarDays,
  Compass,
  Home as HomeIcon,
  Layers,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { DiscoveryCategoryItem } from "@/lib/discovery/discovery-navigator.functions";

const ICONS: Record<string, LucideIcon> = {
  "bed-double": BedDouble,
  utensils: Utensils,
  compass: Compass,
  home: HomeIcon,
  binoculars: Binoculars,
  "calendar-days": CalendarDays,
  layers: Layers,
};

export interface DiscoveryNavigatorProps {
  title?: string;
  categories: DiscoveryCategoryItem[];
  showCounts?: boolean;
  variant?: "panel" | "list" | "grid";
  ctaLabel?: string;
  ctaHref?: string;
  /** Placeholder si no hay categorías con datos. `null` → oculta el bloque. */
  emptyLabel?: string | null;
  /** Slots futuros (promociones, eventos, Alux). Se renderizan al final. */
  slots?: ReactNode;
}

export function DiscoveryNavigator({
  title = "Explora el destino",
  categories,
  showCounts = true,
  variant = "panel",
  ctaLabel,
  ctaHref,
  emptyLabel = "Aún no hay categorías publicadas para este destino.",
  slots,
}: DiscoveryNavigatorProps) {
  if (categories.length === 0 && emptyLabel === null && !slots) return null;

  const layout =
    variant === "grid"
      ? "grid grid-cols-2 gap-3"
      : variant === "list"
        ? "flex flex-col divide-y divide-border"
        : "flex flex-col gap-2";

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      data-discovery-navigator
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {categories.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {categories.length} categoría{categories.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      {categories.length === 0 ? (
        emptyLabel ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null
      ) : (
        <ul className={layout}>
          {categories.map((c) => {
            const Icon = ICONS[c.iconKey] ?? Layers;
            return (
              <li key={c.slug}>
                <a
                  href={c.href}
                  className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium leading-tight">
                      {c.label}
                    </span>
                    {showCounts ? (
                      <span className="block text-xs text-muted-foreground">
                        {c.count} {c.count === 1 ? "opción" : "opciones"}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                  >
                    →
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {ctaHref && ctaLabel ? (
        <div className="mt-4 border-t border-border pt-4">
          <a href={ctaHref} className="text-sm font-medium text-primary hover:underline">
            {ctaLabel} →
          </a>
        </div>
      ) : null}

      {slots ? <div className="mt-4 space-y-4">{slots}</div> : null}
    </section>
  );
}