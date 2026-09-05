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
import { ChevronRight, Home } from "lucide-react";

import type { BreadcrumbCrumb } from "@/types/territory";
import { useResolvedContext } from "@/lib/context-engine";
import { cn } from "@/lib/utils";
import { TerritorialSwitcherMount } from "@/components/navigation/TerritorialSwitcherMount";
import { CompactCrumbs, shouldCompactCrumbs } from "@/components/layout/CompactCrumbs";

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

  // Cadenas cortas (≤3 niveles con la casita) se renderizan completas.
  const compact = compactOnMobile && shouldCompactCrumbs(effectiveCrumbs);

  return (
    <nav
      aria-label="Ruta territorial"
      className={cn("flex items-start justify-between gap-3 text-sm", className)}
    >
      {compact ? <CompactCrumbs crumbs={effectiveCrumbs} anchorIndex={mobileAnchorIndex} /> : null}
      {/* Móvil: una sola línea desplazable; desde `sm` puede envolver. */}
      <ol
        className={cn(
          "flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap text-muted-foreground [scrollbar-width:none] sm:flex-wrap sm:whitespace-normal",
          compact ? "hidden sm:flex" : null,
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
        className={cn("h-8 min-w-40 shrink-0 text-xs", compact ? "hidden sm:flex" : null)}
      />
    </nav>
  );
}
