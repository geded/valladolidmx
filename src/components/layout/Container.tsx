/**
 * Container — Ancho máximo y padding horizontal estandarizados.
 * Propósito: garantizar consistencia de gutter en todas las secciones.
 * Dependencias: cn() de @/lib/utils.
 */
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
