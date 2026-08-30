/**
 * OMXDS G6-S1 · CategoryNavGrid
 *
 * Única autoridad responsive para la navegación por categorías turísticas
 * en las superficies adoptadas (S1, S2, S3, S8, S9). Ninguna plantilla
 * define su propio grid de categorías.
 *
 * Responsive gobernado:
 *  - móvil  : 2 columnas
 *  - tablet : 4 columnas
 *  - escritorio: la plantilla puede pasar `desktopColumnsClassName`
 *  - touch target mínimo 44×44 px · etiquetas máximo dos líneas
 *  - cero overflow horizontal (min-w-0 + truncado a 2 líneas)
 */
import type { ReactNode } from "react";
import { isRegisteredCategory } from "@/lib/omxds/category-icon-registry";
import { TourismCategoryIcon } from "./TourismCategoryIcon";
import type { CategoryIconVariant } from "@/lib/omxds/category-icon-registry";

export interface CategoryNavItem {
  slug: string;
  label: string;
  href?: string | null;
  count?: number | null;
  countLabel?: string | null;
  disabled?: boolean;
}

export interface CategoryNavGridProps {
  items: readonly CategoryNavItem[];
  variant?: CategoryIconVariant;
  /** `navigate`: enlaces. `select`: botones controlados. */
  mode?: "navigate" | "select";
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  /** Escritorio gobernado por la plantilla (Tailwind classes `lg:*`). */
  desktopColumnsClassName?: string;
  /** Acredita espacio para íconos de 56 px. */
  spaceCredited?: boolean;
  scheme?: "light" | "dark";
  showCounts?: boolean;
  emptySlot?: ReactNode;
  className?: string;
}

export function CategoryNavGrid({
  items,
  variant = "standard",
  mode = "navigate",
  activeSlug = null,
  onSelect,
  desktopColumnsClassName = "lg:grid-cols-4",
  spaceCredited = false,
  scheme = "light",
  showCounts = true,
  emptySlot = null,
  className,
}: CategoryNavGridProps) {
  if (items.length === 0) return <>{emptySlot}</>;

  return (
    <ul
      data-omxds-category-nav-grid
      className={[
        "grid w-full min-w-0 grid-cols-2 gap-3 md:grid-cols-4",
        desktopColumnsClassName,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => {
        const isActive = activeSlug === item.slug;
        const registered = isRegisteredCategory(item.slug);
        const inner = (
          <>
            {registered ? (
              <TourismCategoryIcon
                slug={item.slug}
                variant={variant}
                spaceCredited={spaceCredited}
                scheme={scheme}
                /* G8-E2 · OBS-G8E1-03 — glifo bordado 40 px en móvil,
                   44 px en tablet y 48 px en escritorio, sin deformar. */
                className={
                  variant === "standard"
                    ? "size-10 shrink-0 object-contain md:size-11 lg:size-12"
                    : undefined
                }
              />
            ) : null}
            <span className="min-w-0 text-center">
              <span className="line-clamp-2 block text-sm font-medium leading-snug">
                {item.label}
              </span>
              {showCounts && typeof item.count === "number" ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.countLabel ?? `${item.count} ${item.count === 1 ? "opción" : "opciones"}`}
                </span>
              ) : null}
            </span>
          </>
        );

        // G6-S1-A · D-G6-02: el control real (enlace o botón) garantiza
        // 44×44 px reales, foco visible y activación por teclado nativa.
        const cls = [
          "flex min-h-[44px] min-w-[44px] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3",
          "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive
            ? "border-primary/50 bg-primary/5"
            : "border-border/70 bg-card hover:border-border hover:bg-muted/40",
          item.disabled ? "pointer-events-none opacity-50" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <li key={item.slug} className="min-w-0">
            {mode === "navigate" && item.href ? (
              <a
                href={item.href}
                className={cls}
                data-omxds-touch-target="44"
                aria-current={isActive ? "page" : undefined}
              >
                {inner}
              </a>
            ) : (
              <button
                type="button"
                className={cls}
                data-omxds-touch-target="44"
                aria-pressed={isActive}
                disabled={item.disabled}
                onClick={() => onSelect?.(item.slug)}
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
