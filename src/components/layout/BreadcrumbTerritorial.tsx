/**
 * BreadcrumbTerritorial — Migas alineadas a la jerarquía territorial
 * Región → Destino → Categoría → Empresa (Blueprint §3 / 11.1).
 *
 * Propósito: que la navegación NUNCA pierda el contexto territorial.
 * Reutilizable para cualquier región del futuro (no hardcodea Oriente Maya).
 *
 * Dependencias: @tanstack/react-router Link, types/territory.
 */
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { BreadcrumbCrumb } from "@/types/territory";
import { useResolvedContext } from "@/lib/context-engine";
import { cn } from "@/lib/utils";
import { TerritorialSwitcherMount } from "@/components/navigation/TerritorialSwitcherMount";

interface Props {
  /**
   * Migas explícitas. Mientras `useContextCrumbs` sea `false` (default),
   * ésta sigue siendo la fuente única. Retrocompatibilidad total.
   */
  crumbs?: readonly BreadcrumbCrumb[];
  /**
   * H-02 · I2 — Opt-in para derivar migas desde el Context Engine.
   * Default `false`: comportamiento idéntico al actual. Cuando `true`
   * y `useResolvedContext()` retorna contexto, `ancestors + current` se
   * usan como migas. Si no hay contexto disponible, cae a `crumbs`.
   */
  useContextCrumbs?: boolean;
  /**
   * Progressive disclosure en móvil (≤639px): sólo se muestran casita,
   * la miga ancla (por defecto el destino) y la miga actual truncada.
   * Los niveles intermedios se agrupan en un menú accesible.
   */
  compactOnMobile?: boolean;
  /**
   * Índice (dentro de `crumbs`) de la miga que permanece visible en
   * móvil. Default: `crumbs.length - 3` (destino en rutas canónicas).
   */
  mobileAnchorIndex?: number;
  className?: string;
}


function crumbsFromContext(
  ctx: NonNullable<ReturnType<typeof useResolvedContext>>,
): readonly BreadcrumbCrumb[] {
  const nodes = [...ctx.ancestors, ctx.current];
  return nodes.map((n) => ({
    label: n.label,
    to: n.href,
    params: n.params ? { ...n.params } : undefined,
  }));
}

export function BreadcrumbTerritorial({
  crumbs,
  useContextCrumbs = false,
  compactOnMobile = false,
  mobileAnchorIndex,
  className,
}: Props) {
  const ctx = useResolvedContext();
  const effectiveCrumbs: readonly BreadcrumbCrumb[] =
    useContextCrumbs && ctx ? crumbsFromContext(ctx) : (crumbs ?? []);

  if (effectiveCrumbs.length === 0) return null;

  return (
    <nav
      aria-label="Ruta territorial"
      className={cn("flex items-start justify-between gap-3 text-sm", className)}
    >
      {compactOnMobile ? (
        <CompactMobileCrumbs crumbs={effectiveCrumbs} anchorIndex={mobileAnchorIndex} />
      ) : null}
      {/* Móvil: una sola línea desplazable; desde `sm` puede envolver. */}
      <ol
        className={cn(
          "flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap text-muted-foreground [scrollbar-width:none] sm:flex-wrap sm:whitespace-normal",
          compactOnMobile ? "hidden sm:flex" : null,
        )}
      >

        <li className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="size-3.5" aria-hidden />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {effectiveCrumbs.map((c, i) => {
          const isLast = i === effectiveCrumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 shrink-0 items-center gap-1.5">
              <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />

              {c.to && !isLast ? (
                <Link
                  to={c.to}
                  params={c.params as never}
                  className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "block truncate",
                    // El nombre actual puede truncarse en móvil.
                    isLast ? "max-w-[46vw] font-medium text-foreground sm:max-w-none" : "",
                  )}
                >
                  {c.label}
                </span>
              )}

            </li>
          );
        })}
      </ol>
      {/*
        N2.5 · Montaje visual único del DestinationSwitcher junto al
        breadcrumb. Se autooculta si no hay contexto territorial o si
        existe un único destino publicado — no genera ruido en Home,
        Blog, Contacto ni superficies sin ancla.
      */}
      <TerritorialSwitcherMount
        className={cn(
          "h-8 min-w-40 shrink-0 text-xs",
          compactOnMobile ? "hidden sm:flex" : null,
        )}
      />
    </nav>
  );
}

/**
 * Variante compacta ≤639px: casita → (menú de niveles intermedios) →
 * ancla territorial → nombre actual truncado. Una sola línea, sin
 * scroll horizontal, con etiquetas completas para lectores de pantalla.
 */
function CompactMobileCrumbs({
  crumbs,
  anchorIndex,
}: {
  crumbs: readonly BreadcrumbCrumb[];
  anchorIndex?: number;
}) {
  const lastIndex = crumbs.length - 1;
  const rawAnchor = anchorIndex ?? lastIndex - 2;
  const anchor = Math.min(Math.max(rawAnchor, 0), Math.max(lastIndex - 1, 0));
  const current = crumbs[lastIndex];
  const anchorCrumb = anchor < lastIndex ? crumbs[anchor] : undefined;
  const hidden = crumbs.filter((_, i) => i !== lastIndex && i !== anchor);

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
          className="block max-w-[42vw] truncate font-medium text-foreground"
        >
          {current.label}
        </span>
      </li>
    </ol>
  );
}

