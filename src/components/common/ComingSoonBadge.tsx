/**
 * ComingSoonBadge — Etiqueta sutil para módulos preparados pero no activos.
 * Usado en Alux flotante, sección Empresas (motor de visibilidad), etc.
 */
import { cn } from "@/lib/utils";

export function ComingSoonBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {label}
    </span>
  );
}
