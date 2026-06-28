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
import { cn } from "@/lib/utils";

interface Props {
  crumbs: readonly BreadcrumbCrumb[];
  className?: string;
}

export function BreadcrumbTerritorial({ crumbs, className }: Props) {
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
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
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
