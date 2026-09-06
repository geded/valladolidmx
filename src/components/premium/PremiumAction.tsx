import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PremiumActionVM } from "./types";

export function PremiumAction({
  action,
  variant = "default",
  className,
}: {
  action: PremiumActionVM;
  variant?: "default" | "outline";
  /** Ajustes de layout aportados por el bloque contenedor (ancho, contraste). */
  className?: string;
}) {
  const content = (
    <>
      {action.icon}
      {action.label}
    </>
  );
  const classes = cn("min-h-11 rounded-full", className);

  if (action.href) {
    return (
      <Button asChild variant={variant} className={classes}>
        <Link to={action.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} className={classes} onClick={action.onClick}>
      {content}
    </Button>
  );
}
