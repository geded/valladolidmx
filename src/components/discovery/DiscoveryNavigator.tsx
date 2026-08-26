/**
 * H-02 · Iniciativa 2 — Discovery Navigator (presentational).
 *
 * G6-S1: la iconografía y el grid responsive dejan de vivir aquí.
 * Este componente sólo aporta encabezado, CTA y slots; delega en
 * `CategoryNavGrid` (autoridad única responsive) y en
 * `TourismCategoryIcon` (autoridad única de iconografía).
 * Prohibido reintroducir mapas locales de íconos o fallback `Layers`.
 */
import type { ReactNode } from "react";
import { CategoryNavGrid } from "@/components/omxds/CategoryNavGrid";
import type { DiscoveryCategoryItem } from "@/lib/discovery/discovery-navigator.functions";

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
  /**
   * `navigate` (default): los chips son enlaces (`href`) que salen del
   * micrositio. `inline`: los chips son botones que emiten `onSelect`
   * y el explorador se abre debajo del propio bloque.
   */
  mode?: "navigate" | "inline";
  activeCategory?: string | null;
  onSelect?: (slug: string) => void;
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
  mode = "navigate",
  activeCategory = null,
  onSelect,
}: DiscoveryNavigatorProps) {
  if (categories.length === 0 && emptyLabel === null && !slots) return null;

  const desktopColumns =
    variant === "list"
      ? "lg:grid-cols-2"
      : variant === "grid"
        ? "lg:grid-cols-4"
        : "lg:grid-cols-3";

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

      <CategoryNavGrid
        items={categories.map((c) => ({
          slug: c.slug,
          label: c.label,
          href: c.href,
          count: c.count,
        }))}
        mode={mode === "inline" ? "select" : "navigate"}
        activeSlug={activeCategory}
        onSelect={onSelect}
        showCounts={showCounts}
        desktopColumnsClassName={desktopColumns}
        emptySlot={
          emptyLabel ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null
        }
      />

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
