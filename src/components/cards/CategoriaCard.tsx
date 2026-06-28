/**
 * CategoriaCard — Tarjeta reutilizable de Categoría.
 *
 * Hoy: las categorías con ruta top-level (experiencias/hoteles/restaurantes/
 * eventos) son links navegables; el resto muestra "próximamente". Cuando
 * en Fase 1 exista /categoria/$slug, se sustituye el mapa por la ruta
 * dinámica sin tocar consumidores.
 */
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type { Category } from "@/types/entities";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";

const PALETTE_BG: Record<Category["palette"], string> = {
  primary: "bg-primary/10 text-primary",
  selva: "bg-selva/15 text-selva",
  cenote: "bg-cenote/15 text-cenote",
  atardecer: "bg-atardecer/15 text-atardecer",
};

const ROUTE_BY_SLUG: Partial<
  Record<string, "/experiencias" | "/hoteles" | "/restaurantes" | "/eventos">
> = {
  experiencias: "/experiencias",
  hoteles: "/hoteles",
  restaurantes: "/restaurantes",
  eventos: "/eventos",
};

export function CategoriaCard({ category }: { category: Category }) {
  const { t } = useTranslation();
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[category.icon] ?? Icons.Sparkles;
  const route = ROUTE_BY_SLUG[category.slug];

  const inner = (
    <>
      <span aria-hidden className={cn("grid size-10 place-items-center rounded-xl", PALETTE_BG[category.palette])}>
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-base font-semibold">{category.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        {!route ? (
          <p className="mt-2 text-xs text-muted-foreground">· {t("common.coming_soon")}</p>
        ) : null}
      </div>
    </>
  );

  const baseClass =
    "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:shadow-md";

  return route ? (
    <Link to={route} className={baseClass}>
      {inner}
    </Link>
  ) : (
    <div className={cn(baseClass, "opacity-90")}>{inner}</div>
  );
}
