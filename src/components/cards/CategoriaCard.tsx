/**
 * CategoriaCard — Tarjeta reutilizable de Categoría.
 * Compatible con cualquier región y cualquier set de categorías.
 */
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type { Category } from "@/types/entities";
import { cn } from "@/lib/utils";

const PALETTE_BG: Record<Category["palette"], string> = {
  primary: "bg-primary/10 text-primary",
  selva: "bg-selva/15 text-selva",
  cenote: "bg-cenote/15 text-cenote",
  atardecer: "bg-atardecer/15 text-atardecer",
};

export function CategoriaCard({ category }: { category: Category }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[category.icon] ?? Icons.Sparkles;
  return (
    <Link
      to="/$category"
      params={{ category: category.slug }}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:shadow-md"
    >
      <span
        aria-hidden
        className={cn("grid size-10 place-items-center rounded-xl", PALETTE_BG[category.palette])}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-base font-semibold">{category.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
      </div>
    </Link>
  );
}
