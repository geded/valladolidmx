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
  className,
}: Props) {
  const ctx = useResolvedContext();
  const effectiveCrumbs: readonly BreadcrumbCrumb[] =
    useContextCrumbs && ctx ? crumbsFromContext(ctx) : (crumbs ?? []);

  if (effectiveCrumbs.length === 0) return null;

  return (
    <nav aria-label="Ruta territorial" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li className="flex items-center gap-1.5">
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
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 opacity-50" aria-hidden />
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
                  className={cn(isLast ? "font-medium text-foreground" : "")}
                >
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
