/**
 * CompactCrumbs — Primitiva compartida de breadcrumb compacto en móvil.
 *
 * Fuente única del patrón ≤639px:
 *   [casita] → [menú de niveles intermedios] → [ancla territorial] → [actual]
 *
 * La consumen `BreadcrumbTerritorial` (Discovery/PublicShell) y
 * `PremiumTerritorialBreadcrumb` (fichas Premium) para evitar dos
 * implementaciones divergentes. Una sola línea (44px), sin scroll
 * horizontal, con etiquetas completas para lectores de pantalla.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BreadcrumbCrumb } from "@/types/territory";
import { ORIENTE_MAYA } from "@/config/regions";

/** Ruta canónica de un destino: `/oriente-maya/{slug}` (sin más segmentos). */
const DESTINATION_HREF = new RegExp(`^/${ORIENTE_MAYA.slug}/[^/]+$`);

/**
 * Ancla que permanece visible en móvil. Preferencia semántica: la miga
 * del destino. Si el Context Engine entrega otra jerarquía, se cae a la
 * posición (cadenas de 4+ migas → `length - 3`; de 3 → `length - 2`).
 */
export function resolveCompactAnchorIndex(
  crumbs: readonly BreadcrumbCrumb[],
  explicit?: number,
): number {
  const lastIndex = crumbs.length - 1;
  if (typeof explicit === "number") {
    return clamp(explicit, lastIndex);
  }
  const semantic = crumbs.findIndex(
    (c, i) => i < lastIndex && typeof c.to === "string" && DESTINATION_HREF.test(c.to),
  );
  if (semantic >= 0) return semantic;
  return clamp(crumbs.length >= 4 ? crumbs.length - 3 : crumbs.length - 2, lastIndex);
}

function clamp(value: number, lastIndex: number): number {
  return Math.min(Math.max(value, 0), Math.max(lastIndex - 1, 0));
}

/**
 * Sólo se compacta a partir de 4 niveles visibles (casita + 3 migas).
 * Cadenas cortas se renderizan completas y sin menú vacío.
 */
export function shouldCompactCrumbs(crumbs: readonly BreadcrumbCrumb[]): boolean {
  return crumbs.length > 2;
}

export function CompactCrumbs({
  crumbs,
  anchorIndex,
}: {
  crumbs: readonly BreadcrumbCrumb[];
  anchorIndex?: number;
}) {
  const lastIndex = crumbs.length - 1;
  const anchor = resolveCompactAnchorIndex(crumbs, anchorIndex);
  const current = crumbs[lastIndex];
  const anchorCrumb = anchor < lastIndex ? crumbs[anchor] : undefined;
  // La casita ya cubre Home: no se repite dentro del menú.
  const hidden = crumbs.filter((c, i) => i !== lastIndex && i !== anchor && c.to !== "/");

  if (!current) return null;

  return (
    <ol className="flex h-11 min-w-0 flex-nowrap items-center gap-1.5 text-[13px] text-muted-foreground sm:hidden">
      <li className="flex shrink-0 items-center">
        <Link
          to="/"
          aria-label="Inicio"
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
        >
          <Home className="size-4" aria-hidden />
        </Link>
      </li>

      {hidden.length > 0 ? (
        <li className="flex shrink-0 items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
          <Popover>
            <PopoverTrigger
              aria-label="Mostrar niveles intermedios de la ruta"
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              <ul className="flex flex-col">
                {hidden.map((c, i) => (
                  <li key={`${c.label}-${i}`}>
                    {c.to ? (
                      <Link
                        to={c.to}
                        params={c.params as never}
                        className="flex min-h-11 items-center rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span className="flex min-h-11 items-center px-2 text-sm text-muted-foreground">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </li>
      ) : null}

      {anchorCrumb ? (
        <li className="flex shrink-0 items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
          {anchorCrumb.to ? (
            <Link
              to={anchorCrumb.to}
              params={anchorCrumb.params as never}
              className="inline-flex min-h-11 max-w-[28vw] items-center truncate rounded-md px-1 hover:bg-accent hover:text-accent-foreground"
            >
              {anchorCrumb.label}
            </Link>
          ) : (
            <span className="inline-flex min-h-11 max-w-[28vw] items-center truncate px-1">
              {anchorCrumb.label}
            </span>
          )}
        </li>
      ) : null}

      <li className="flex min-w-0 items-center gap-1.5">
        <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
        <span
          aria-current="page"
          title={current.label}
          className="block max-w-[42vw] truncate font-medium text-foreground"
        >
          {current.label}
        </span>
      </li>
    </ol>
  );
}
