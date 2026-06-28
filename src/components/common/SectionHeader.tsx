/**
 * SectionHeader — Encabezado estándar para secciones de Home y rutas.
 * Responsabilidades: título display + subtítulo + slot opcional CTA derecha.
 * Reutilizable en cualquier sección.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, subtitle, align = "left", actions, className }: Props) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3 md:mb-12",
        align === "center" ? "items-center text-center" : "items-start",
        actions ? "md:flex-row md:items-end md:justify-between" : "",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-balance text-3xl leading-tight md:text-4xl">{title}</h2>
        {subtitle ? (
          <p className="mt-3 text-base text-muted-foreground md:text-lg">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
